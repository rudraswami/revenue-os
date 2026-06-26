import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { EmbeddedSignupService } from "./embedded-signup.service";
import { WhatsappAccountsController } from "./whatsapp-accounts.controller";
import { WhatsappAccountsService } from "./whatsapp-accounts.service";

@Module({
  imports: [AuthModule, BillingModule, WhatsappModule],
  controllers: [WhatsappAccountsController],
  providers: [WhatsappAccountsService, EmbeddedSignupService],
  exports: [WhatsappAccountsService, EmbeddedSignupService],
})
export class WhatsappAccountsModule {}
