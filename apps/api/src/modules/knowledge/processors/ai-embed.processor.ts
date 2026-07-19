import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "@growvisi/shared";
import { KnowledgeEmbedService } from "../knowledge-embed.service";
import { KnowledgeRetrievalService } from "../knowledge-retrieval.service";

export interface EmbedJobData {
  documentId: string;
  organizationId: string;
}

@Processor(QUEUES.AI_EMBED)
export class AiEmbedProcessor extends WorkerHost {
  private readonly logger = new Logger(AiEmbedProcessor.name);

  constructor(
    private readonly embed: KnowledgeEmbedService,
    private readonly retrieval: KnowledgeRetrievalService,
  ) {
    super();
  }

  async process(job: Job<EmbedJobData>) {
    const { documentId, organizationId } = job.data;
    this.logger.debug(`Embedding document ${documentId}`);
    try {
      await this.embed.embedDocument(documentId, organizationId);
      this.retrieval.invalidateChunkCountCache(organizationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Embed job failed for ${documentId}: ${message}`);
      throw err;
    }
  }
}
