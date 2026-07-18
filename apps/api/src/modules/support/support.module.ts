import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { SetupHelpService } from "./setup-help.service";
import { SupportController } from "./support.controller";
import { MarketingHelpService } from "./marketing-help.service";
import { MarketingHelpController } from "./marketing-help.controller";
import { MarketingInquiryService } from "./marketing-inquiry.service";

@Module({
  imports: [OrganizationsModule, WhatsappAccountsModule, AuthModule],
  controllers: [SupportController, MarketingHelpController],
  providers: [SetupHelpService, MarketingHelpService, MarketingInquiryService],
  exports: [SetupHelpService, MarketingHelpService, MarketingInquiryService],
})
export class SupportModule {}
