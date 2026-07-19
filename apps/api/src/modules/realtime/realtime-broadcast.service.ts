import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Supabase Broadcast fallback when Socket.IO is unavailable (Vercel serverless). */
@Injectable()
export class RealtimeBroadcastService {
  private readonly logger = new Logger(RealtimeBroadcastService.name);
  private readonly client: SupabaseClient | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>("SUPABASE_URL")?.trim();
    const key = this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    this.client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  }

  get enabled(): boolean {
    return this.client != null;
  }

  async publish(
    organizationId: string,
    event: string,
    payload: Record<string, unknown> | object,
  ): Promise<void> {
    if (!this.client) return;

    const channelName = `org:${organizationId}`;
    const channel = this.client.channel(channelName);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          void this.client?.removeChannel(channel);
          reject(new Error("Supabase broadcast subscribe timeout"));
        }, 5_000);

        channel.subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          clearTimeout(timeout);
          void channel
            .send({ type: "broadcast", event, payload })
            .then(() => {
              void this.client?.removeChannel(channel);
              resolve();
            })
            .catch((err) => {
              void this.client?.removeChannel(channel);
              reject(err);
            });
        });
      });
    } catch (err) {
      this.logger.warn(`Supabase broadcast failed (${event}): ${String(err)}`);
    }
  }
}
