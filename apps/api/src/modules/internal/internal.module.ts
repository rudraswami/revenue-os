import { Module } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { AiModule } from "../ai/ai.module";
import { AutomationsModule } from "../automations/automations.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { DigestModule } from "../digest/digest.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { InternalCronController } from "./internal-cron.controller";
import { InternalLatencyController } from "./internal-latency.controller";
import { InternalJobsController } from "../jobs/internal-jobs.controller";
import { DataRetentionService } from "./data-retention.service";

@Module({
  imports: [
    PrismaModule,
    AiModule,
    WhatsappModule,
    WhatsappAccountsModule,
    AutomationsModule,
    DigestModule,
    CampaignsModule,
    KnowledgeModule,
  ],
  controllers: [
    InternalCronController,
    InternalLatencyController,
    InternalJobsController,
  ],
  providers: [CronSecretGuard, DataRetentionService],
})
export class InternalModule {}