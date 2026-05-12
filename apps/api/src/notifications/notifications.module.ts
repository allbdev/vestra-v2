import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PusherService } from "./pusher.service";
import { WebPushService } from "./web-push.service";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PusherService, WebPushService],
  exports: [NotificationsService, PusherService, WebPushService],
})
export class NotificationsModule {}
