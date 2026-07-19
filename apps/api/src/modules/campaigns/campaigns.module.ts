import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QUEUES } from "@growvisi/shared";
import { useBackgroundWorkers } from "../../config/workers";
import { BillingModule } from "../billing/billing.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { EmailVerifiedGuard } from "../../common/guards/email-verified.guard";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { CampaignSendProcessor } from "./processors/campaign-send.processor";

const registerProcessors = useBackgroundWorkers();

@Module({
  imports: [
    BillingModule,
    WhatsappModule,
    BullModule.registerQueue({ name: QUEUES.CAMPAIGN_SEND }),
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    MembershipRoleGuard,
    SubscriptionGuard,
    EmailVerifiedGuard,
    ...(registerProcessors ? [CampaignSendProcessor] : []),
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
