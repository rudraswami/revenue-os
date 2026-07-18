import { Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { EmailVerifiedGuard } from "../../common/guards/email-verified.guard";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { AgencyController } from "./agency.controller";
import { AgencyService } from "./agency.service";

@Module({
  imports: [BillingModule, WhatsappAccountsModule, AuthModule],
  controllers: [AgencyController],
  providers: [AgencyService, MembershipRoleGuard, SubscriptionGuard, EmailVerifiedGuard],
  exports: [AgencyService],
})
export class AgencyModule {}
