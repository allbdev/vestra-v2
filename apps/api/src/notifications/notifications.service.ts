import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PusherService } from "./pusher.service";
import { WebPushService } from "./web-push.service";

export interface CreateNotificationInput {
  userId: string;
  workspaceId?: string | null;
  type: string;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue | null;
  dedupeKey?: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private pusher: PusherService,
    private webpush: WebPushService,
  ) {}

  async list(userId: string, opts: { limit?: number; cursor?: string } = {}) {
    const limit = Math.min(opts.limit ?? 20, 50);
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      take: limit + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: items.map(this.toDto),
      nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async create(input: CreateNotificationInput) {
    let row;
    try {
      row = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          workspaceId: input.workspaceId ?? null,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data ?? Prisma.JsonNull,
          dedupeKey: input.dedupeKey ?? null,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return null;
      }
      throw err;
    }

    const payload = this.toDto(row);
    await this.pusher.trigger(input.userId, "notification", payload);
    await this.webpush.sendToUser(input.userId, payload);
    return payload;
  }

  private toDto = (row: {
    id: string;
    type: string;
    title: string;
    body: string;
    data: Prisma.JsonValue | null;
    readAt: Date | null;
    createdAt: Date;
  }) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data as Record<string, unknown> | null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  });
}
