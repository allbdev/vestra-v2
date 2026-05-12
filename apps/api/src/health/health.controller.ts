import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    const startedAt = process.uptime();
    let db: "ok" | "down" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return {
      status: db === "ok" ? "ok" : "degraded",
      uptime: Math.floor(startedAt),
      db,
      time: new Date().toISOString(),
    };
  }
}
