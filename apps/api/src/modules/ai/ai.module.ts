import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "@growvisi/shared";
import { AutomationsModule } from "../automations/automations.module";
import { BillingModule } from "../billing/billing.module";
import { EventsModule } from "../events/events.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { AiClassifyService } from "./ai-classify.service";
import { AiClassifyProcessor } from "./processors/ai-classify.processor";
import { useBackgroundWorkers } from "../../config/workers";

const registerProcessors = useBackgroundWorkers();

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.AI_CLASSIFY }),
    EventsModule,
    RealtimeModule,
    WebhooksModule,
    IntelligenceModule,
    KnowledgeModule,
    AutomationsModule,
    BillingModule,
  ],
  providers: [AiClassifyService, ...(registerProcessors ? [AiClassifyProcessor] : [])],
  exports: [AiClassifyService],
})
export class AiModule {}
