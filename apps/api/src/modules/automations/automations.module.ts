import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [AutomationsController],
  providers: [AutomationsService, MembershipRoleGuard, SubscriptionGuard],
  exports: [AutomationsService],
})
export class AutomationsModule {}
