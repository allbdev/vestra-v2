import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionService } from "../plans/subscription.service";
import { mapOptionalForeignKey } from "./clone-workspace-maps";

const CLONE_NAME_SUFFIX = " - clone";
const MAX_WORKSPACE_NAME_LENGTH = 255;

function buildClonedName(sourceName: string): string {
  const base = `${sourceName.trim()}${CLONE_NAME_SUFFIX}`;
  return base.length <= MAX_WORKSPACE_NAME_LENGTH
    ? base
    : base.slice(0, MAX_WORKSPACE_NAME_LENGTH);
}

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

  /**
   * Owner-only deep clone. Copies workspace + every category, template, and
   * transaction in a single $transaction. Soft-deleted rows are preserved on
   * the clone (faithful snapshot). FKs remapped through old→new id maps.
   */
  async clone(sourceWorkspaceId: string, userId: string) {
    const limit = await this.subs.checkWorkspaceLimit(userId);
    if (!limit.allowed) {
      throw new ForbiddenException({
        message: "Workspace limit reached for current plan",
        reason: limit.reason,
      });
    }

    const source = await this.prisma.workspace.findFirst({
      where: { id: sourceWorkspaceId, deletedAt: null, ownerId: userId },
    });
    if (!source) {
      throw new NotFoundException("Workspace not found or you are not its owner");
    }

    const newName = buildClonedName(source.name);

    return this.prisma.$transaction(
      async (tx) => {
        const newWorkspace = await tx.workspace.create({
          data: { name: newName, ownerId: userId },
        });
        await tx.workspaceUser.create({
          data: { workspaceId: newWorkspace.id, userId },
        });

        const categoryIdMap = new Map<string, string>();
        const sourceCategories = await tx.category.findMany({
          where: { workspaceId: sourceWorkspaceId },
          orderBy: { createdAt: "asc" },
        });
        for (const c of sourceCategories) {
          const created = await tx.category.create({
            data: {
              workspaceId: newWorkspace.id,
              ownerId: userId,
              name: c.name,
              type: c.type,
              color: c.color,
              deletedAt: c.deletedAt,
              createdAt: c.createdAt,
              updatedAt: c.updatedAt,
            },
          });
          categoryIdMap.set(c.id, created.id);
        }

        const templateIdMap = new Map<string, string>();
        const sourceTemplates = await tx.transactionTemplate.findMany({
          where: { workspaceId: sourceWorkspaceId },
          orderBy: { createdAt: "asc" },
        });
        for (const t of sourceTemplates) {
          const created = await tx.transactionTemplate.create({
            data: {
              workspaceId: newWorkspace.id,
              ownerId: userId,
              categoryId: mapOptionalForeignKey(t.categoryId, categoryIdMap),
              description: t.description,
              baseAmount: t.baseAmount,
              frequency: t.frequency,
              startDate: t.startDate,
              active: t.active,
              deletedAt: t.deletedAt,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
            },
          });
          templateIdMap.set(t.id, created.id);
        }

        const sourceTransactions = await tx.transaction.findMany({
          where: { workspaceId: sourceWorkspaceId },
          orderBy: { createdAt: "asc" },
        });
        for (const r of sourceTransactions) {
          await tx.transaction.create({
            data: {
              workspaceId: newWorkspace.id,
              ownerId: userId,
              categoryId: mapOptionalForeignKey(r.categoryId, categoryIdMap),
              templateId: mapOptionalForeignKey(r.templateId, templateIdMap),
              description: r.description,
              amount: r.amount,
              date: r.date,
              isPaid: r.isPaid,
              paidAt: r.paidAt,
              deletedAt: r.deletedAt,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            },
          });
        }

        return newWorkspace;
      },
      { maxWait: 10_000, timeout: 60_000 },
    );
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
