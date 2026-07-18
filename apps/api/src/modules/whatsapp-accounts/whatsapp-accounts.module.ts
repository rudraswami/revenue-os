import { Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { EmailVerifiedGuard } from "../../common/guards/email-verified.guard";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { EmbeddedSignupService } from "./embedded-signup.service";
import { WhatsappAccountsController } from "./whatsapp-accounts.controller";
import { WhatsappAccountsService } from "./whatsapp-accounts.service";

@Module({
  imports: [AuthModule, BillingModule, WhatsappModule],
  controllers: [WhatsappAccountsController],
  providers: [WhatsappAccountsService, EmbeddedSignupService, MembershipRoleGuard, SubscriptionGuard, EmailVerifiedGuard],
  exports: [WhatsappAccountsService, EmbeddedSignupService],
})
export class WhatsappAccountsModule {}
