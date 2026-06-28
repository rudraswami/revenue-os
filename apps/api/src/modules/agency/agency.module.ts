import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { AgencyController } from "./agency.controller";
import { AgencyService } from "./agency.service";

@Module({
  imports: [BillingModule, WhatsappAccountsModule],
  controllers: [AgencyController],
  providers: [AgencyService],
  exports: [AgencyService],
})
export class AgencyModule {}
