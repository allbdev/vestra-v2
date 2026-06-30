import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../common/decorators/public.decorator";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  // Liveness — polled by Fly health checks every 30s. MUST NOT touch the DB,
  // or Neon never gets its 5-min idle window and never autosuspends (which
  // burns the free-tier compute-hour budget 24/7). Only reports the process up.
  @Public()
  @Get()
  check() {
    return {
      status: "ok",
      uptime: Math.floor(process.uptime()),
      time: new Date().toISOString(),
    };
  }

  // Readiness — verifies DB connectivity. Call manually or from an external
  // monitor at a LOW frequency / on demand. Do NOT point a frequent health
  // check at this route, or it defeats Neon autosuspend.
  @Public()
  @Get("ready")
  async ready() {
    let db: "ok" | "down" = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return {
      status: db === "ok" ? "ok" : "degraded",
      uptime: Math.floor(process.uptime()),
      db,
      time: new Date().toISOString(),
    };
  }
}
