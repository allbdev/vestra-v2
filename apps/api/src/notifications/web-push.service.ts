import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private configured = false;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const pub = this.config.get<string>("VAPID_PUBLIC");
    const priv = this.config.get<string>("VAPID_PRIVATE");
    const subject = this.config.get<string>("VAPID_SUBJECT") ?? "mailto:alb.develloper@gmail.com";
    if (pub && priv) {
      webpush.setVapidDetails(subject, pub, priv);
      this.configured = true;
    } else {
      this.logger.warn("VAPID keys not configured — web push disabled");
    }
  }

  async sendToUser(userId: string, payload: unknown) {
    if (!this.configured) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    const serialized = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.authKey },
            },
            serialized,
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
            return;
          }
          this.logger.error(`Web push failed for sub ${sub.id}: ${(err as Error).message}`);
        }
      }),
    );
  }
}
