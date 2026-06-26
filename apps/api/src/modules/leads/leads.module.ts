import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";

@Module({
  imports: [BillingModule, WebhooksModule],
  controllers: [LeadsController],
  providers: [LeadsService, MembershipRoleGuard],
})
export class LeadsModule {}
