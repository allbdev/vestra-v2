import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionService } from "../plans/subscription.service";

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private subs: SubscriptionService,
  ) {}

  async listForUser(userId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { users: { some: { userId, deletedAt: null } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        users: {
          where: { deletedAt: null },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { categories: true, transactions: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return workspaces.map((w) => ({
      ...w,
      isOwner: w.ownerId === userId,
    }));
  }

  async get(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        users: {
          where: { deletedAt: null },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { categories: true, transactions: true } },
      },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");
    return { ...workspace, isOwner: workspace.ownerId === userId };
  }

  async create(userId: string, name: string) {
    const limit = await this.subs.checkWorkspaceLimit(userId);
    if (!limit.allowed) {
      throw new ForbiddenException({
        message: "Workspace limit reached for current plan",
        reason: limit.reason,
      });
    }
    return this.prisma.workspace.create({
      data: { name, ownerId: userId },
    });
  }

  async update(workspaceId: string, name: string) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });
  }

  async softDelete(workspaceId: string) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });
  }

  async listUsers(workspaceId: string) {
    return this.prisma.workspaceUser.findMany({
      where: { workspaceId, deletedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async removeUser(workspaceId: string, targetUserId: string, requesterId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { ownerId: true },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const isOwner = workspace.ownerId === requesterId;
    const isSelf = requesterId === targetUserId;
    if (!isOwner && !isSelf) throw new ForbiddenException("Cannot remove this user");
    if (targetUserId === workspace.ownerId) {
      throw new BadRequestException("Cannot remove workspace owner");
    }

    return this.prisma.workspaceUser.updateMany({
      where: { workspaceId, userId: targetUserId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
