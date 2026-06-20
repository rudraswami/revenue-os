import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmbeddedSignupService } from "./embedded-signup.service";
import { WhatsappAccountsController } from "./whatsapp-accounts.controller";
import { WhatsappAccountsService } from "./whatsapp-accounts.service";

@Module({
  imports: [AuthModule],
  controllers: [WhatsappAccountsController],
  providers: [WhatsappAccountsService, EmbeddedSignupService],
  exports: [WhatsappAccountsService, EmbeddedSignupService],
})
export class WhatsappAccountsModule {}
