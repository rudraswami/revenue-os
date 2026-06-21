import { Module } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { AutomationsModule } from "../automations/automations.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { InternalCronController } from "./internal-cron.controller";

@Module({
  imports: [WhatsappAccountsModule, AutomationsModule],
  controllers: [InternalCronController],
  providers: [CronSecretGuard],
})
export class InternalModule {}