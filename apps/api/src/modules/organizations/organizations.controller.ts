import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get("current")
  getCurrent(@CurrentUser() user: Parameters<typeof OrganizationsService.prototype.getCurrent>[0]) {
    return this.organizations.getCurrent(user);
  }

  @Get("members")
  listMembers(@CurrentUser() user: Parameters<typeof OrganizationsService.prototype.listMembers>[0]) {
    return this.organizations.listMembers(user);
  }
}
