import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "@growvisi/shared";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { EmailVerifiedGuard } from "../../common/guards/email-verified.guard";
import { BillingModule } from "../billing/billing.module";
import { EventsModule } from "../events/events.module";
import { useBackgroundWorkers } from "../../config/workers";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { KnowledgeRetrievalService } from "./knowledge-retrieval.service";
import { KnowledgeService } from "./knowledge.service";
import { AiEmbedProcessor } from "./processors/ai-embed.processor";

const registerProcessors = useBackgroundWorkers();

@Module({
  imports: [
    BillingModule,
    EventsModule,
    BullModule.registerQueue({ name: QUEUES.AI_EMBED }),
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    KnowledgeEmbedService,
    KnowledgeRetrievalService,
    MembershipRoleGuard,
    SubscriptionGuard,
    EmailVerifiedGuard,
    ...(registerProcessors ? [AiEmbedProcessor] : []),
  ],
  exports: [KnowledgeService, KnowledgeEmbedService, KnowledgeRetrievalService],
})
export class KnowledgeModule {}
