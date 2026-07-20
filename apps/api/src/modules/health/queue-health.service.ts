import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { QUEUES } from "@growvisi/shared";
import { useBackgroundWorkers } from "../../config/workers";

export type QueueCountSnapshot = Record<
  string,
  {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }
>;

@Injectable()
export class QueueHealthService {
  constructor(
    @InjectQueue(QUEUES.WHATSAPP_INBOUND) private readonly inbound: Queue,
    @InjectQueue(QUEUES.AI_CLASSIFY) private readonly classify: Queue,
    @InjectQueue(QUEUES.AI_EMBED) private readonly embed: Queue,
    @InjectQueue(QUEUES.CAMPAIGN_SEND) private readonly campaignSend: Queue,
  ) {}

  async getJobCounts(): Promise<QueueCountSnapshot | null> {
    if (!useBackgroundWorkers()) return null;

    const queues: Array<[string, Queue]> = [
      [QUEUES.WHATSAPP_INBOUND, this.inbound],
      [QUEUES.AI_CLASSIFY, this.classify],
      [QUEUES.AI_EMBED, this.embed],
      [QUEUES.CAMPAIGN_SEND, this.campaignSend],
    ];

    const snapshot: QueueCountSnapshot = {};
    for (const [name, queue] of queues) {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      );
      snapshot[name] = {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        delayed: counts.delayed ?? 0,
        paused: counts.paused ?? 0,
      };
    }
    return snapshot;
  }
}
