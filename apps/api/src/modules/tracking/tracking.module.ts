import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { TrackingController } from "./tracking.controller";
import { TrackingService } from "./tracking.service";

@Module({
  imports: [BillingModule],
  controllers: [TrackingController],
  providers: [TrackingService, MembershipRoleGuard, SubscriptionGuard],
  exports: [TrackingService],
})
export class TrackingModule {}
