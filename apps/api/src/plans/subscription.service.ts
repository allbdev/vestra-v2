import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type LimitReason = "limit_reached" | "pro_only";
export interface LimitCheck {
  allowed: boolean;
  reason?: LimitReason;
}

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getActivePlan(userId: string) {
    const userPlan = await this.prisma.userPlan.findFirst({
      where: { userId, isActive: true },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return userPlan?.plan ?? null;
  }

  async hasProPlan(userId: string) {
    const plan = await this.getActivePlan(userId);
    return plan?.name === "pro";
  }

  async checkWorkspaceLimit(userId: string): Promise<LimitCheck> {
    if (await this.hasProPlan(userId)) return { allowed: true };

    const count = await this.prisma.workspace.count({
      where: { ownerId: userId, deletedAt: null },
    });
    if (count >= 1) return { allowed: false, reason: "limit_reached" };
    return { allowed: true };
  }

  async checkInviteLimit(workspaceId: string, ownerId: string): Promise<LimitCheck> {
    if (await this.hasProPlan(ownerId)) return { allowed: true };

    const userCount = await this.prisma.workspaceUser.count({
      where: { workspaceId, deletedAt: null },
    });
    if (userCount >= 2) return { allowed: false, reason: "limit_reached" };
    return { allowed: true };
  }
}
