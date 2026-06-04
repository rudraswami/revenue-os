import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "@growthsync/shared";
import { AiClassifyService, type ClassifyJobData } from "../ai-classify.service";

@Processor(QUEUES.AI_CLASSIFY)
export class AiClassifyProcessor extends WorkerHost {
  private readonly logger = new Logger(AiClassifyProcessor.name);

  constructor(private readonly classify: AiClassifyService) {
    super();
  }

  async process(job: Job<ClassifyJobData>) {
    try {
      await this.classify.process(job.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Classification failed for message ${job.data.messageId}: ${message}`);
      throw error;
    }
  }
}
