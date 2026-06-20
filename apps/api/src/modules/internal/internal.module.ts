import { Module } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { InternalCronController } from "./internal-cron.controller";

@Module({
  imports: [WhatsappAccountsModule],
  controllers: [InternalCronController],
  providers: [CronSecretGuard],
})
export class InternalModule {}
