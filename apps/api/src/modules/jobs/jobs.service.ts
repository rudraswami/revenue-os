import { Injectable, Logger } from "@nestjs/common";
import type { JobType } from "@growvisi/shared";
import { deferBackgroundTask } from "../../common/utils/defer-background";
import {
  QstashService,
  type BatchJobMessage,
  type PublishJobOptions,
} from "./qstash.service";

/**
 * Single entry point for durable background work.
 *
 * When QStash is configured, work is published as a durable, retried HTTP job.
 * Otherwise it runs via `deferBackgroundTask` (waitUntil on Vercel, detached
 * promise on long-running hosts) exactly as before — so behavior is unchanged in
 * environments without QStash, and hardened where it is enabled.
 *
 * `inline` MUST perform the same work the InternalJobsController would run for
 * this job type, so the fallback and the durable path stay equivalent.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly qstash: QstashService) {}

  get durable(): boolean {
    return this.qstash.isEnabled();
  }

  enqueue<T>(
    type: JobType,
    body: T,
    inline: () => Promise<unknown>,
    options?: PublishJobOptions,
  ): void {
    if (this.qstash.isEnabled()) {
      void this.qstash.publish(type, body, options).catch((err) => {
        this.logger.error(
          `QStash publish failed for ${type} (${err instanceof Error ? err.message : err}) — running inline`,
        );
        deferBackgroundTask(inline);
      });
      return;
    }
    deferBackgroundTask(inline);
  }

  enqueueBatch(messages: BatchJobMessage[], inline: () => Promise<unknown>): void {
    if (messages.length === 0) return;
    if (this.qstash.isEnabled()) {
      void this.qstash.publishBatch(messages).catch((err) => {
        this.logger.error(
          `QStash batch publish failed (${err instanceof Error ? err.message : err}) — running inline`,
        );
        deferBackgroundTask(inline);
      });
      return;
    }
    deferBackgroundTask(inline);
  }
}
