import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { TagsController } from "./tags.controller";
import { TagsService } from "./tags.service";

@Module({
  imports: [BillingModule],
  controllers: [TagsController],
  providers: [TagsService, MembershipRoleGuard, SubscriptionGuard],
})
export class TagsModule {}
