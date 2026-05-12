import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { WorkspaceMemberGuard } from "../common/guards/workspace-member.guard";
import { PrismaService } from "../prisma/prisma.service";
import {
  ListNotificationsQueryDto,
  PushSubscribeDto,
  PusherAuthDto,
  WorkspacePrefDto,
} from "./dto/notifications.dto";
import { NotificationsService } from "./notifications.service";
import { PusherService } from "./pusher.service";

@ApiBearerAuth()
@ApiTags("notifications")
@Controller()
export class NotificationsController {
  constructor(
    private notifications: NotificationsService,
    private pusher: PusherService,
    private prisma: PrismaService,
  ) {}

  @Get("notifications")
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.list(user.id, query);
  }

  @Get("notifications/unread-count")
  async unreadCount(@CurrentUser() user: RequestUser) {
    const count = await this.notifications.unreadCount(user.id);
    return { count };
  }

  @Patch("notifications/:id/read")
  @HttpCode(HttpStatus.OK)
  markRead(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.notifications.markRead(id, user.id);
  }

  @Patch("notifications/read-all")
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post("pusher/auth")
  @HttpCode(HttpStatus.OK)
  pusherAuth(@CurrentUser() user: RequestUser, @Body() dto: PusherAuthDto) {
    const expected = this.pusher.channelForUser(user.id);
    if (dto.channel_name !== expected) {
      // eslint-disable-next-line no-console
      console.warn(
        `[pusher-auth] reject: user=${user.id} requested=${dto.channel_name} expected=${expected}`,
      );
      throw new ForbiddenException("Channel does not belong to user");
    }
    try {
      const auth = this.pusher.authorizeChannel(dto.socket_id, dto.channel_name, user.id);
      // eslint-disable-next-line no-console
      console.log(`[pusher-auth] ok: user=${user.id} channel=${dto.channel_name}`);
      return auth;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[pusher-auth] failed: ${(err as Error).message}`);
      throw new BadRequestException("Pusher not configured");
    }
  }

  @Post("push/subscribe")
  @HttpCode(HttpStatus.OK)
  async pushSubscribe(
    @CurrentUser() user: RequestUser,
    @Body() dto: PushSubscribeDto,
  ) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId: user.id,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        authKey: dto.auth,
        userAgent: dto.userAgent ?? null,
      },
      update: {
        userId: user.id,
        p256dh: dto.p256dh,
        authKey: dto.auth,
        userAgent: dto.userAgent ?? null,
      },
    });
    return { ok: true };
  }

  @Delete("push/subscribe")
  @HttpCode(HttpStatus.OK)
  async pushUnsubscribe(
    @CurrentUser() user: RequestUser,
    @Body() body: { endpoint?: string },
  ) {
    if (!body?.endpoint) throw new BadRequestException("endpoint required");
    await this.prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint: body.endpoint },
    });
    return { ok: true };
  }

  @Get("notifications/workspace-prefs")
  async listWorkspacePrefs(@CurrentUser() user: RequestUser) {
    const rows = await this.prisma.workspaceNotificationPref.findMany({
      where: { userId: user.id },
      select: { workspaceId: true, muted: true },
    });
    return { prefs: rows };
  }

  @UseGuards(WorkspaceMemberGuard)
  @Get("workspaces/:workspaceId/notification-prefs/me")
  async getWorkspacePref(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
  ) {
    const pref = await this.prisma.workspaceNotificationPref.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    return { muted: pref?.muted ?? false };
  }

  @UseGuards(WorkspaceMemberGuard)
  @Put("workspaces/:workspaceId/notification-prefs/me")
  @HttpCode(HttpStatus.OK)
  async setWorkspacePref(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: WorkspacePrefDto,
  ) {
    const pref = await this.prisma.workspaceNotificationPref.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      create: { userId: user.id, workspaceId, muted: dto.muted },
      update: { muted: dto.muted },
    });
    return { muted: pref.muted };
  }
}
