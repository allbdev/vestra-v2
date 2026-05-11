import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.plan.findMany({ orderBy: { price: "asc" } });
  }

  async current(userId: string) {
    const userPlan = await this.prisma.userPlan.findFirst({
      where: { userId, isActive: true },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return userPlan?.plan ?? null;
  }
}
