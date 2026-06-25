import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";

@Module({
  imports: [BillingModule, WhatsappModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, MembershipRoleGuard],
})
export class CampaignsModule {}
