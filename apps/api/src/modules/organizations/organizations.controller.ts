import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsEnum, IsOptional } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import type { JwtPayload, MembershipRole } from "@growvisi/shared";
import { OrganizationsService } from "./organizations.service";

class UpdateReplyTemplatesDto {
  @IsOptional()
  templates?: Array<{ id?: string; title: string; body: string }>;
}

class UpdateMemberRoleDto {
  @IsEnum(["ADMIN", "MANAGER", "AGENT", "VIEWER"])
  role!: MembershipRole;
}

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

@Controller("organizations")
@UseGuards(JwtAuthGuard, MembershipRoleGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get("current")
  getCurrent(@CurrentUser() user: JwtPayload) {
    return this.organizations.getCurrent(user);
  }

  @Get("members")
  listMembers(@CurrentUser() user: JwtPayload) {
    return this.organizations.listMembers(user);
  }

  @Get("team-limits")
  teamLimits(@CurrentUser() user: JwtPayload) {
    return this.organizations.getTeamLimits(user);
  }

  @Patch("members/:memberId/role")
  @Roles(...ADMIN_ROLES)
  updateMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param("memberId") memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizations.updateMemberRole(user, memberId, dto.role);
  }

  @Delete("members/:memberId")
  @Roles(...ADMIN_ROLES)
  removeMember(@CurrentUser() user: JwtPayload, @Param("memberId") memberId: string) {
    return this.organizations.removeMember(user, memberId);
  }

  @Get("reply-templates")
  replyTemplates(@CurrentUser() user: JwtPayload) {
    return this.organizations.getReplyTemplates(user);
  }

  @Patch("reply-templates")
  @Roles(...ADMIN_ROLES)
  updateReplyTemplates(@CurrentUser() user: JwtPayload, @Body() dto: UpdateReplyTemplatesDto) {
    return this.organizations.updateReplyTemplates(user, dto.templates);
  }
}
