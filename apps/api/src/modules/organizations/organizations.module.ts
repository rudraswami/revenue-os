import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrganizationInvitesController } from "./organization-invites.controller";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController, OrganizationInvitesController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
