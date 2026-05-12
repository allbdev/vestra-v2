import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Pusher from "pusher";

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private client: Pusher | null = null;

  constructor(private config: ConfigService) {}

  private getClient(): Pusher | null {
    if (this.client) return this.client;
    const appId = this.config.get<string>("PUSHER_APP_ID");
    const key = this.config.get<string>("PUSHER_KEY");
    const secret = this.config.get<string>("PUSHER_SECRET");
    const cluster = this.config.get<string>("PUSHER_CLUSTER");
    if (!appId || !key || !secret || !cluster) {
      this.logger.warn("Pusher env not configured — skipping realtime emit");
      return null;
    }
    this.client = new Pusher({ appId, key, secret, cluster, useTLS: true });
    return this.client;
  }

  channelForUser(userId: string) {
    return `private-user-${userId}`;
  }

  async trigger(userId: string, event: string, payload: unknown) {
    const c = this.getClient();
    if (!c) {
      this.logger.warn(`Pusher skip: client not configured (user=${userId} event=${event})`);
      return;
    }
    const channel = this.channelForUser(userId);
    try {
      await c.trigger(channel, event, payload);
      this.logger.log(`Pusher trigger ok: channel=${channel} event=${event}`);
    } catch (err) {
      this.logger.error(
        `Pusher trigger failed: channel=${channel} event=${event} err=${(err as Error).message}`,
      );
    }
  }

  authorizeChannel(socketId: string, channel: string, userId: string) {
    const c = this.getClient();
    if (!c) {
      throw new Error("Pusher not configured");
    }
    if (channel.startsWith("presence-")) {
      return c.authorizeChannel(socketId, channel, { user_id: userId });
    }
    return c.authorizeChannel(socketId, channel);
  }
}
