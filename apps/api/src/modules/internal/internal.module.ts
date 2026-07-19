import { Module } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { AiModule } from "../ai/ai.module";
import { AutomationsModule } from "../automations/automations.module";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { DigestModule } from "../digest/digest.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { InternalCronController } from "./internal-cron.controller";
import { InternalLatencyController } from "./internal-latency.controller";

@Module({
  imports: [
    PrismaModule,
    AiModule,
    WhatsappAccountsModule,
    AutomationsModule,
    DigestModule,
    CampaignsModule,
  ],
  controllers: [InternalCronController, InternalLatencyController],
  providers: [CronSecretGuard],
})
export class InternalModule {}