import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUES } from "@growvisi/shared";
import { AutomationsModule } from "../automations/automations.module";
import { AssignmentModule } from "../assignments/assignment.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { BillingModule } from "../billing/billing.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { AiClassifyService } from "./ai-classify.service";
import { AiClassifyProcessor } from "./processors/ai-classify.processor";

const isVercel = process.env.VERCEL === "1";

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.AI_CLASSIFY }),
    RealtimeModule,
    AutomationsModule,
    BillingModule,
    AssignmentModule,
    WebhooksModule,
  ],
  providers: [AiClassifyService, ...(isVercel ? [] : [AiClassifyProcessor])],
  exports: [AiClassifyService],
})
export class AiModule {}
