import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Broadcast for serverless deployments where Socket.IO is unavailable.
 *
 * Uses a persistent channel per org (cached and reused across events) instead of
 * creating/destroying a channel per message. A per-channel subscribe → send →
 * remove round-trip added hundreds of ms per event; keeping the channel alive
 * eliminates that overhead and makes inbound messages appear near-instantly.
 */
@Injectable()
export class RealtimeBroadcastService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeBroadcastService.name);
  private readonly client: SupabaseClient | null;
  private readonly channels = new Map<string, RealtimeChannel>();
  private readonly pending = new Map<string, Promise<RealtimeChannel>>();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>("SUPABASE_URL")?.trim();
    const key = this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    this.client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  }

  get enabled(): boolean {
    return this.client != null;
  }

  onModuleDestroy() {
    for (const [name, channel] of this.channels) {
      void this.client?.removeChannel(channel);
      this.channels.delete(name);
    }
    this.pending.clear();
  }

  async publish(
    organizationId: string,
    event: string,
    payload: Record<string, unknown> | object,
  ): Promise<void> {
    if (!this.client) return;

    try {
      const channel = await this.getOrCreateChannel(organizationId);
      await channel.send({ type: "broadcast", event, payload });
    } catch (err) {
      // Channel might be stale/disconnected — drop it so next call retries.
      this.dropChannel(organizationId);
      this.logger.warn(`Supabase broadcast failed (${event}): ${String(err)}`);
    }
  }

  private async getOrCreateChannel(organizationId: string): Promise<RealtimeChannel> {
    const channelName = `org:${organizationId}`;
    const existing = this.channels.get(channelName);
    if (existing) return existing;

    // Deduplicate concurrent subscribe calls for the same org.
    const inflight = this.pending.get(channelName);
    if (inflight) return inflight;

    const promise = this.subscribeChannel(channelName);
    this.pending.set(channelName, promise);
    try {
      const channel = await promise;
      this.channels.set(channelName, channel);
      return channel;
    } finally {
      this.pending.delete(channelName);
    }
  }

  private subscribeChannel(channelName: string): Promise<RealtimeChannel> {
    return new Promise<RealtimeChannel>((resolve, reject) => {
      const channel = this.client!.channel(channelName);
      const timeout = setTimeout(() => {
        void this.client?.removeChannel(channel);
        reject(new Error("Supabase broadcast subscribe timeout"));
      }, 5_000);

      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        clearTimeout(timeout);
        resolve(channel);
      });
    });
  }

  private dropChannel(organizationId: string) {
    const channelName = `org:${organizationId}`;
    const channel = this.channels.get(channelName);
    if (channel) {
      void this.client?.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }
}
