import { Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { AssignmentModule } from "../assignments/assignment.module";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { DigestModule } from "../digest/digest.module";
import { WhatsappAccountsModule } from "../whatsapp-accounts/whatsapp-accounts.module";
import { OrganizationInvitesController } from "./organization-invites.controller";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [AuthModule, BillingModule, DigestModule, AssignmentModule, WhatsappAccountsModule],
  controllers: [OrganizationsController, OrganizationInvitesController],
  providers: [OrganizationsService, MembershipRoleGuard],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
