import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { WebhookDispatchService } from "./webhook-dispatch.service";
import { WebhooksController } from "./webhooks.controller";

@Module({
  imports: [BillingModule],
  controllers: [WebhooksController],
  providers: [WebhookDispatchService, MembershipRoleGuard, SubscriptionGuard],
  exports: [WebhookDispatchService],
})
export class WebhooksModule {}
