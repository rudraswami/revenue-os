import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, Receiver } from "@upstash/qstash";
import type { JobType } from "@growvisi/shared";

export interface PublishJobOptions {
  /** Retry attempts QStash performs on non-2xx callbacks (exponential backoff). */
  retries?: number;
  /** Delay before first delivery, in seconds. */
  delaySeconds?: number;
  /** Idempotency key — QStash drops duplicate messages with the same id. */
  deduplicationId?: string;
}

export interface BatchJobMessage<T = unknown> {
  type: JobType;
  body: T;
  options?: PublishJobOptions;
}

/**
 * Thin wrapper over Upstash QStash — the serverless-durable job transport.
 *
 * Publishing enqueues an HTTP callback to `POST /internal/jobs/:type` on our own
 * API; QStash handles retries/backoff/DLQ and survives function cold-stops. When
 * `QSTASH_TOKEN` / `QSTASH_CALLBACK_URL` are not configured (local, CI, preview),
 * `isEnabled()` is false and callers fall back to inline execution.
 */
@Injectable()
export class QstashService {
  private readonly logger = new Logger(QstashService.name);
  private readonly client: Client | null;
  private readonly receiver: Receiver | null;
  private readonly baseOrigin: string | null;

  constructor(private readonly config: ConfigService) {
    const token = config.get<string>("QSTASH_TOKEN")?.trim();
    this.client = token ? new Client({ token }) : null;

    const currentSigningKey = config.get<string>("QSTASH_CURRENT_SIGNING_KEY")?.trim();
    const nextSigningKey = config.get<string>("QSTASH_NEXT_SIGNING_KEY")?.trim();
    this.receiver =
      currentSigningKey && nextSigningKey
        ? new Receiver({ currentSigningKey, nextSigningKey })
        : null;

    const rawBase = config.get<string>("QSTASH_CALLBACK_URL")?.trim();
    this.baseOrigin = rawBase ? rawBase.replace(/\/+$/, "") : null;
  }

  /** True when jobs should be published to QStash instead of run inline. */
  isEnabled(): boolean {
    return this.client !== null && this.baseOrigin !== null;
  }

  /** True when incoming callbacks can be cryptographically verified. */
  canVerify(): boolean {
    return this.receiver !== null;
  }

  /** Full URL QStash calls back for a given job type (must match on verify). */
  callbackUrl(type: JobType): string {
    const base = this.baseOrigin ?? "";
    const withPrefix = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
    return `${withPrefix}/internal/jobs/${type}`;
  }

  async publish<T>(type: JobType, body: T, options?: PublishJobOptions): Promise<void> {
    if (!this.client || !this.baseOrigin) {
      throw new Error("QStash is not configured");
    }
    await this.client.publishJSON({
      url: this.callbackUrl(type),
      body,
      retries: options?.retries ?? 3,
      delay: options?.delaySeconds,
      deduplicationId: options?.deduplicationId,
    });
  }

  async publishBatch(messages: BatchJobMessage[]): Promise<void> {
    if (!this.client || !this.baseOrigin) {
      throw new Error("QStash is not configured");
    }
    if (messages.length === 0) return;
    await this.client.batchJSON(
      messages.map((m) => ({
        url: this.callbackUrl(m.type),
        body: m.body,
        retries: m.options?.retries ?? 3,
        delay: m.options?.delaySeconds,
        deduplicationId: m.options?.deduplicationId,
      })),
    );
  }

  /**
   * Verify an inbound QStash callback signature against the raw request body.
   * Returns false when verification is not configured (caller decides fallback).
   */
  async verify(signature: string, rawBody: string, type: JobType): Promise<boolean> {
    if (!this.receiver) return false;
    try {
      return await this.receiver.verify({
        signature,
        body: rawBody,
        url: this.baseOrigin ? this.callbackUrl(type) : undefined,
      });
    } catch (err) {
      this.logger.warn(
        `QStash signature verification error: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }
}
