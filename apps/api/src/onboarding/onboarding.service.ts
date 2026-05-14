import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ONBOARDING_MAX_STEP, OnboardingStepResponse } from "./dto/onboarding.dto";

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async initialize(userId: string): Promise<void> {
    const existing = await this.prisma.onboarding.findFirst({ where: { userId } });
    if (existing) return;
    await this.prisma.onboarding.create({
      data: { userId, step: 1, completed: false },
    });
  }

  async getCurrent(userId: string): Promise<OnboardingStepResponse | null> {
    const row = await this.prisma.onboarding.findFirst({
      where: { userId, completed: false },
      orderBy: { step: "asc" },
    });
    if (!row) return null;
    return { step: row.step, completed: row.completed };
  }

  async complete(userId: string, step: number): Promise<OnboardingStepResponse | null> {
    const row = await this.prisma.onboarding.findFirst({
      where: { userId, step, completed: false },
    });
    if (row) {
      await this.prisma.onboarding.update({
        where: { id: row.id },
        data: { completed: true },
      });

      const nextStep = step + 1;
      if (nextStep <= ONBOARDING_MAX_STEP) {
        const nextExists = await this.prisma.onboarding.findFirst({
          where: { userId, step: nextStep },
        });
        if (!nextExists) {
          await this.prisma.onboarding.create({
            data: { userId, step: nextStep, completed: false },
          });
        }
      }
    }
    return this.getCurrent(userId);
  }
}
