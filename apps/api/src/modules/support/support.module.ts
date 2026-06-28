import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { SetupHelpService } from "./setup-help.service";
import { SupportController } from "./support.controller";

@Module({
  imports: [OrganizationsModule, WhatsappAccountsModule],
  controllers: [SupportController],
  providers: [SetupHelpService],
  exports: [SetupHelpService],
})
export class SupportModule {}
