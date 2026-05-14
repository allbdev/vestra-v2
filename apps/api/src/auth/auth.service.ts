import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { OnboardingService } from "../onboarding/onboarding.service";
import type { Response } from "express";
import { REFRESH_COOKIE } from "./strategies/jwt-refresh.strategy";

const REFRESH_TTL_DAYS = 30;
const CONFIRMATION_TTL_MIN = 5;
const RESET_TTL_MIN = 30;

export interface AuthTokens {
  accessToken: string;
  user: { id: string; email: string; name: string | null };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
    private onboarding: OnboardingService,
  ) {}

  private async hashPassword(plain: string) {
    return bcrypt.hash(plain, 10);
  }

  private async signAccessToken(userId: string, email: string) {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: (this.config.get<string>("JWT_ACCESS_TTL") ?? "15m") as never,
      },
    );
  }

  private async signRefreshToken(userId: string, jti: string) {
    return this.jwt.signAsync(
      { sub: userId, jti },
      {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: (this.config.get<string>("JWT_REFRESH_TTL") ?? "30d") as never,
      },
    );
  }

  private cookieOptions() {
    const secure = this.config.get<string>("COOKIE_SECURE") === "true";
    const domain = this.config.get<string>("COOKIE_DOMAIN") || undefined;
    const maxAgeMs = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
    return {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      domain,
      maxAge: maxAgeMs,
      path: "/api/v1/auth",
    };
  }

  private async issueSession(
    res: Response,
    user: { id: string; email: string; name: string | null },
  ): Promise<AuthTokens> {
    const jti = randomBytes(16).toString("hex");
    const refresh = await this.signRefreshToken(user.id, jti);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: { userId: user.id, token: refresh, expiresAt },
    });
    res.cookie(REFRESH_COOKIE, refresh, this.cookieOptions());

    const accessToken = await this.signAccessToken(user.id, user.email);
    return { accessToken, user };
  }

  async register(name: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const hashed = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, email: true, name: true },
    });

    await this.onboarding.initialize(user.id);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.prisma.confirmationCode.create({ data: { email, code } });
    await this.email.sendConfirmationCode(email, code);

    return { user };
  }

  async confirm(email: string, code: string) {
    const record = await this.prisma.confirmationCode.findFirst({
      where: { email, code },
      orderBy: { createdAt: "desc" },
    });
    if (!record) throw new BadRequestException("Invalid code");

    const ageMin = (Date.now() - record.createdAt.getTime()) / 60000;
    if (ageMin > CONFIRMATION_TTL_MIN) throw new BadRequestException("Code expired");

    await this.prisma.confirmationCode.deleteMany({ where: { email } });
    return { ok: true };
  }

  async login(email: string, password: string, res: Response): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    return this.issueSession(res, { id: user.id, email: user.email, name: user.name });
  }

  async refresh(
    user: { id: string; email: string; name: string | null; sessionId: string; refreshToken: string },
    res: Response,
  ): Promise<AuthTokens> {
    // Idempotent: a parallel refresh may have already rotated this session.
    // deleteMany returns count without throwing on missing rows.
    await this.prisma.session.deleteMany({ where: { id: user.sessionId } });
    return this.issueSession(res, { id: user.id, email: user.email, name: user.name });
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      await this.prisma.session.deleteMany({ where: { token: refreshToken } });
    }
    res.clearCookie(REFRESH_COOKIE, { ...this.cookieOptions(), maxAge: 0 });
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) return { ok: true };

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);
    await this.prisma.passwordResetToken.create({ data: { email, token, expiresAt } });
    try {
      await this.email.sendPasswordReset(email, token);
    } catch {
      // Anti-enumeration: same response shape whether email exists or send fails.
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record) throw new BadRequestException("Invalid token");
    if (record.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({ where: { id: record.id } });
      throw new BadRequestException("Token expired");
    }

    const hashed = await this.hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: { email: record.email }, data: { password: hashed } }),
      this.prisma.passwordResetToken.deleteMany({ where: { email: record.email } }),
    ]);
    return { ok: true };
  }
}
