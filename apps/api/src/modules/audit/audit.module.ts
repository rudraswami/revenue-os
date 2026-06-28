import { Global, Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { BillingModule } from "../billing/billing.module";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

@Global()
@Module({
  imports: [BillingModule],
  controllers: [AuditController],
  providers: [AuditService, MembershipRoleGuard, SubscriptionGuard],
  exports: [AuditService],
})
export class AuditModule {}
