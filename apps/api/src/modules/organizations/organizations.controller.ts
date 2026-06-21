import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { IsOptional } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { JwtPayload } from "@growvisi/shared";
import { OrganizationsService } from "./organizations.service";

class UpdateReplyTemplatesDto {
  @IsOptional()
  templates?: Array<{ id?: string; title: string; body: string }>;
}

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

  @Get("reply-templates")
  replyTemplates(@CurrentUser() user: JwtPayload) {
    return this.organizations.getReplyTemplates(user);
  }

  @Patch("reply-templates")
  updateReplyTemplates(@CurrentUser() user: JwtPayload, @Body() dto: UpdateReplyTemplatesDto) {
    return this.organizations.updateReplyTemplates(user, dto.templates);
  }
}
