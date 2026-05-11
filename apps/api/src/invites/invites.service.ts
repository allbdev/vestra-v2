import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionService } from "../plans/subscription.service";

export const INVITE_STATUS = {
  WAITING: "waiting",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

@Injectable()
export class InvitesService {
  constructor(
    private prisma: PrismaService,
    private subs: SubscriptionService,
  ) {}

  async listForWorkspace(workspaceId: string) {
    return this.prisma.workspaceInvite.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.workspaceInvite.findMany({
      where: { userId, status: INVITE_STATUS.WAITING },
      include: { workspace: { select: { id: true, name: true, ownerId: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(workspaceId: string, ownerId: string, email: string) {
    const limit = await this.subs.checkInviteLimit(workspaceId, ownerId);
    if (!limit.allowed) {
      throw new ForbiddenException({
        message: "Member limit reached for current plan",
        reason: limit.reason,
      });
    }

    const target = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundException("User with that email not found");
    if (target.id === ownerId) throw new BadRequestException("Cannot invite yourself");

    const alreadyMember = await this.prisma.workspaceUser.findFirst({
      where: { workspaceId, userId: target.id, deletedAt: null },
    });
    if (alreadyMember) throw new ConflictException("User already in workspace");

    const existing = await this.prisma.workspaceInvite.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: target.id } },
    });
    if (existing) {
      if (existing.status === INVITE_STATUS.WAITING) {
        throw new ConflictException("Invite already pending");
      }
      return this.prisma.workspaceInvite.update({
        where: { id: existing.id },
        data: { status: INVITE_STATUS.WAITING },
      });
    }

    return this.prisma.workspaceInvite.create({
      data: { workspaceId, userId: target.id, status: INVITE_STATUS.WAITING },
    });
  }

  async accept(inviteId: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException("Invite not found");
    if (invite.userId !== userId) throw new ForbiddenException("Not your invite");
    if (invite.status !== INVITE_STATUS.WAITING) {
      throw new BadRequestException("Invite no longer pending");
    }

    return this.prisma.$transaction([
      this.prisma.workspaceInvite.update({
        where: { id: inviteId },
        data: { status: INVITE_STATUS.ACCEPTED },
      }),
      this.prisma.workspaceUser.create({
        data: { workspaceId: invite.workspaceId, userId },
      }),
    ]);
  }

  async reject(inviteId: string, userId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new NotFoundException("Invite not found");
    if (invite.userId !== userId) throw new ForbiddenException("Not your invite");
    if (invite.status !== INVITE_STATUS.WAITING) {
      throw new BadRequestException("Invite no longer pending");
    }

    return this.prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: INVITE_STATUS.REJECTED },
    });
  }
}
