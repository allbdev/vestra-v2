import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";

export interface RefreshPayload {
  sub: string;
  jti: string;
}

export const REFRESH_COOKIE = "vestra_refresh";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = config.get<string>("JWT_REFRESH_SECRET");
    if (!secret) throw new Error("JWT_REFRESH_SECRET not set");
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => (req?.cookies ? (req.cookies[REFRESH_COOKIE] as string | undefined) ?? null : null),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshPayload) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException();

    const session = await this.prisma.session.findUnique({ where: { token } });
    if (!session) throw new UnauthorizedException("Session revoked");
    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException("Session expired");
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new UnauthorizedException();
    return { ...user, sessionId: session.id, refreshToken: token };
  }
}
