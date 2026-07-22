import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { SkipSubscriptionCheck } from "../../common/decorators/skip-subscription-check.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload, LeadStage, MembershipRole, IntelligenceWorkspaceSettings } from "@growvisi/shared";
import type { Response } from "express";
import { setRedisCacheStatus } from "../../common/http/cache-headers";
import { AssignmentService } from "../assignments/assignment.service";
import { DigestService } from "../digest/digest.service";
import { OrganizationsService } from "./organizations.service";
import type { AssignmentRulesConfig } from "./assignment-rules";
import type { WorkspaceOpsSettings } from "./workspace-settings";

class BusinessVoiceDto {
  @IsOptional()
  @IsEnum(["casual", "professional"])
  register?: "casual" | "professional";

  @IsOptional()
  @IsBoolean()
  useFirstName?: boolean;

  @IsOptional()
  @IsEnum(["none", "sparingly"])
  emoji?: "none" | "sparingly";
}

class BusinessLanguageDto {
  @IsOptional()
  @IsEnum(["en", "hi", "hinglish"])
  default?: "en" | "hi" | "hinglish";

  @IsOptional()
  @IsBoolean()
  mirrorCustomer?: boolean;
}

class BusinessEscalationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;
}

class BusinessCloseActionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  paymentLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bookingUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  callNumber?: string;
}

class BusinessGreetingVariantsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @ArrayMaxSize(8)
  firstContact?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  @ArrayMaxSize(8)
  returning?: string[];
}

class QuickAnswerDto {
  @IsString()
  @MaxLength(40)
  id!: string;

  @IsString()
  @MaxLength(200)
  question!: string;

  @IsString()
  @MaxLength(500)
  answer!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @ArrayMaxSize(12)
  keywords?: string[];

  @IsOptional()
  @IsEnum(["general", "pricing", "policy", "faq", "product"])
  category?: "general" | "pricing" | "policy" | "faq" | "product";
}

class BusinessProfilePatchDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessVoiceDto)
  voice?: BusinessVoiceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessLanguageDto)
  language?: BusinessLanguageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessEscalationDto)
  escalation?: BusinessEscalationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessCloseActionsDto)
  closeActions?: BusinessCloseActionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessGreetingVariantsDto)
  greetingVariants?: BusinessGreetingVariantsDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentMethods?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  socialLinks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickAnswerDto)
  @ArrayMaxSize(50)
  quickAnswers?: QuickAnswerDto[];
}

class UpdateIntelligenceSettingsDto {
  @IsOptional()
  @IsEnum(["intel_only", "assist", "auto_guarded"])
  replyAutonomy?: "intel_only" | "assist" | "auto_guarded";

  @IsOptional()
  @IsEnum(["careful", "balanced", "responsive"])
  automationPreset?: "careful" | "balanced" | "responsive";

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessProfilePatchDto)
  businessProfile?: BusinessProfilePatchDto;
}

class ApplyIndustryHandbookDto {
  @IsString()
  @MaxLength(40)
  industryId!: string;

  @IsOptional()
  @IsBoolean()
  seedKnowledge?: boolean;
}

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

  @IsOptional()
  @IsEnum(["email", "whatsapp", "both"])
  channel?: "email" | "whatsapp" | "both";

  @IsOptional()
  @IsString()
  whatsappPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  whatsappTemplateName?: string | null;

  @IsOptional()
  @IsEnum(["en", "hi"])
  digestLocale?: "en" | "hi";
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
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
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

  @Get("intelligence-settings")
  getIntelligenceSettings(@CurrentUser() user: JwtPayload) {
    return this.organizations.getIntelligenceSettings(user);
  }

  @Patch("intelligence-settings")
  @Roles(...ADMIN_ROLES)
  updateIntelligenceSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateIntelligenceSettingsDto,
  ) {
    return this.organizations.updateIntelligenceSettings(user, dto);
  }

  @Get("industry-handbooks")
  listIndustryHandbooks() {
    return this.organizations.listIndustryHandbooks();
  }

  @Post("apply-industry-handbook")
  @Roles(...ADMIN_ROLES)
  applyIndustryHandbook(@CurrentUser() user: JwtPayload, @Body() dto: ApplyIndustryHandbookDto) {
    return this.organizations.applyIndustryHandbook(user, dto.industryId, {
      seedKnowledge: dto.seedKnowledge,
    });
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

  @Get("shell-bootstrap")
  @SkipSubscriptionCheck()
  async shellBootstrap(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    const result = await this.organizations.getShellBootstrapCached(user);
    setRedisCacheStatus(res, result.redisHit);
    return result.value;
  }

  @Get("onboarding-progress")
  @SkipSubscriptionCheck()
  onboardingProgress(@CurrentUser() user: JwtPayload, @Query("scope") scope?: string) {
    if (scope === "coaching") {
      return this.organizations.getOnboardingCoaching(user.organizationId);
    }
    return this.organizations.getOnboardingProgress(user.organizationId);
  }

  @Get("payment-integration")
  @Roles(...ADMIN_ROLES)
  paymentIntegration(@CurrentUser() user: JwtPayload) {
    return this.organizations.getPaymentIntegration(user);
  }

  @Patch("payment-integration")
  @Roles(...ADMIN_ROLES)
  updatePaymentIntegration(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { razorpayWebhookSecret?: string | null; autoWinOnPayment?: boolean },
  ) {
    return this.organizations.updatePaymentIntegration(user, dto);
  }
}
