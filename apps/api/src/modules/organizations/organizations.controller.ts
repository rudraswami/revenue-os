import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import type { JwtPayload, LeadStage, MembershipRole } from "@growvisi/shared";
import { AssignmentService } from "../assignments/assignment.service";
import { DigestService } from "../digest/digest.service";
import { OrganizationsService } from "./organizations.service";
import type { AssignmentRulesConfig } from "./assignment-rules";
import type { WorkspaceOpsSettings } from "./workspace-settings";

class UpdateReplyTemplatesDto {
  @IsOptional()
  templates?: Array<{ id?: string; title: string; body: string }>;
}

class DigestSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hourIst?: number;
}

class SlaSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(72)
  targetHours?: number;
}

class UpdateOpsSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DigestSettingsDto)
  digest?: DigestSettingsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SlaSettingsDto)
  sla?: SlaSettingsDto;
}

class UpdateMemberRoleDto {
  @IsEnum(["ADMIN", "MANAGER", "AGENT", "VIEWER"])
  role!: MembershipRole;
}

class AssignmentRuleConditionsDto {
  @IsOptional()
  @IsArray()
  stages?: LeadStage[];

  @IsOptional()
  @IsInt()
  minScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsBoolean()
  handoffOnly?: boolean;
}

class AssignmentRuleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentRuleConditionsDto)
  conditions?: AssignmentRuleConditionsDto;

  @IsOptional()
  @IsEnum(["round_robin", "fixed_user"])
  strategy?: "round_robin" | "fixed_user";

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  poolUserIds?: string[];
}

class UpdateAssignmentRulesDto {
  @IsOptional()
  @IsEnum(["round_robin", "unassigned"])
  defaultStrategy?: "round_robin" | "unassigned";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultPoolUserIds?: string[];

  @IsOptional()
  @IsBoolean()
  applyOnNewConversation?: boolean;

  @IsOptional()
  @IsBoolean()
  applyOnHandoff?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentRuleDto)
  rules?: AssignmentRuleDto[];
}

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

@Controller("organizations")
@UseGuards(JwtAuthGuard, MembershipRoleGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly digest: DigestService,
    private readonly assignments: AssignmentService,
  ) {}

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

  @Get("ops-settings")
  getOpsSettings(@CurrentUser() user: JwtPayload) {
    return this.digest.getOpsSettings(user.organizationId);
  }

  @Patch("ops-settings")
  @Roles(...ADMIN_ROLES)
  updateOpsSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOpsSettingsDto) {
    return this.digest.updateOpsSettings(user.organizationId, dto as Partial<WorkspaceOpsSettings>);
  }

  @Get("assignment-rules")
  @Roles(...ADMIN_ROLES)
  getAssignmentRules(@CurrentUser() user: JwtPayload) {
    return this.assignments.getRules(user.organizationId);
  }

  @Patch("assignment-rules")
  @Roles(...ADMIN_ROLES)
  updateAssignmentRules(@CurrentUser() user: JwtPayload, @Body() dto: UpdateAssignmentRulesDto) {
    return this.assignments.updateRules(user.organizationId, dto as Partial<AssignmentRulesConfig>);
  }

  @Get("team-workload")
  teamWorkload(@CurrentUser() user: JwtPayload) {
    return this.assignments.getTeamWorkload(user.organizationId);
  }
}
