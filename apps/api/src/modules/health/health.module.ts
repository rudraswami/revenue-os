import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule } from "@nestjs/config";
import { QUEUES } from "@growvisi/shared";
import { HealthController } from "./health.controller";
import { QueueHealthService } from "./queue-health.service";
import { RootController } from "./root.controller";

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue(
      { name: QUEUES.WHATSAPP_INBOUND },
      { name: QUEUES.AI_CLASSIFY },
      { name: QUEUES.AI_EMBED },
      { name: QUEUES.CAMPAIGN_SEND },
    ),
  ],
  controllers: [RootController, HealthController],
  providers: [QueueHealthService],
  exports: [QueueHealthService],
})
export class HealthModule {}
