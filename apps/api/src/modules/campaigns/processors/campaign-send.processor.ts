import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUES } from "@growvisi/shared";
import { CampaignsService } from "../campaigns.service";

export interface CampaignSendJobData {
  organizationId: string;
  campaignId: string;
}

@Processor(QUEUES.CAMPAIGN_SEND)
export class CampaignSendProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignSendProcessor.name);

  constructor(private readonly campaigns: CampaignsService) {
    super();
  }

  async process(job: Job<CampaignSendJobData>) {
    const { organizationId, campaignId } = job.data;
    this.logger.debug(`Campaign send batch ${campaignId}`);
    try {
      await this.campaigns.runSendUntilDone(organizationId, campaignId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Campaign send failed ${campaignId}: ${message}`);
      throw err;
    }
  }
}
