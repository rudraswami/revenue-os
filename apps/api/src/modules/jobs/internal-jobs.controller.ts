import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { JOB_TYPES, type JobType } from "@growvisi/shared";
import { QstashSignatureGuard } from "./qstash-signature.guard";
import {
  WhatsappService,
  type WhatsappWebhookPayload,
} from "../whatsapp/whatsapp.service";
import { AiClassifyService, type ClassifyJobData } from "../ai/ai-classify.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { DigestService } from "../digest/digest.service";
import { AutomationsService } from "../automations/automations.service";
import { WhatsappAccountsService } from "../whatsapp-accounts/whatsapp-accounts.service";

interface WhatsappInboundJob {
  webhookEventId: string;
  payload: WhatsappWebhookPayload;
}

interface EmbedJob {
  documentId: string;
  organizationId: string;
}

interface CampaignBatchJob {
  campaignId: string;
  recipientIds: string[];
}

interface OrgJob {
  organizationId: string;
}

interface DigestOrgJob extends OrgJob {
  istHour: number;
  dateKey: string;
}

/**
 * QStash callback endpoint. Each durable job published by `JobsService` is
 * delivered here as `POST /internal/jobs/:type` and dispatched to the same
 * processing logic the inline fallback runs. Protected by `QstashSignatureGuard`.
 */
@SkipThrottle()
@Controller("internal/jobs")
export class InternalJobsController {
  private readonly logger = new Logger(InternalJobsController.name);

  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly aiClassify: AiClassifyService,
    private readonly knowledge: KnowledgeService,
    private readonly campaigns: CampaignsService,
    private readonly digest: DigestService,
    private readonly automations: AutomationsService,
    private readonly whatsappAccounts: WhatsappAccountsService,
  ) {}

  @Post(":type")
  @UseGuards(QstashSignatureGuard)
  async handle(
    @Param("type") type: JobType,
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: true }> {
    switch (type) {
      case JOB_TYPES.WHATSAPP_INBOUND: {
        const job = body as unknown as WhatsappInboundJob;
        await this.whatsapp.processWebhookJob(job.webhookEventId, job.payload);
        break;
      }
      case JOB_TYPES.AI_CLASSIFY: {
        await this.aiClassify.process(body as unknown as ClassifyJobData);
        break;
      }
      case JOB_TYPES.AI_EMBED: {
        const job = body as unknown as EmbedJob;
        await this.knowledge.runEmbedJob(job.documentId, job.organizationId);
        break;
      }
      case JOB_TYPES.CAMPAIGN_BATCH: {
        const job = body as unknown as CampaignBatchJob;
        await this.campaigns.runSendBatchJob(job.campaignId, job.recipientIds);
        break;
      }
      case JOB_TYPES.CRON_DIGEST_ORG: {
        const job = body as unknown as DigestOrgJob;
        await this.digest.runDailyDigestForOrg(job.organizationId, {
          istHour: job.istHour,
          dateKey: job.dateKey,
        });
        break;
      }
      case JOB_TYPES.CRON_FOLLOWUP_ORG: {
        await this.automations.runFollowupReminderForOrg(
          (body as unknown as OrgJob).organizationId,
        );
        break;
      }
      case JOB_TYPES.CRON_STALE_DEAL_ORG: {
        await this.automations.runStaleDealSweepForOrg(
          (body as unknown as OrgJob).organizationId,
        );
        break;
      }
      case JOB_TYPES.CRON_TOKEN_REFRESH_ORG: {
        await this.whatsappAccounts.runTokenAutoRefreshForOrg(
          (body as unknown as OrgJob).organizationId,
        );
        break;
      }
      default:
        throw new BadRequestException(`Unknown job type: ${type}`);
    }
    return { ok: true };
  }
}
