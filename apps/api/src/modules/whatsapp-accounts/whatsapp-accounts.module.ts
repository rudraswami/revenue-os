import { Module } from "@nestjs/common";
import { EmbeddedSignupService } from "./embedded-signup.service";
import { WhatsappAccountsController } from "./whatsapp-accounts.controller";
import { WhatsappAccountsService } from "./whatsapp-accounts.service";

@Module({
  controllers: [WhatsappAccountsController],
  providers: [WhatsappAccountsService, EmbeddedSignupService],
  exports: [WhatsappAccountsService, EmbeddedSignupService],
})
export class WhatsappAccountsModule {}
