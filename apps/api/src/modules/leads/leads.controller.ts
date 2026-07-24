import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireCapability } from "../../common/decorators/require-capability.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { LeadsService } from "./leads.service";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import type { MetricsPeriod } from "../../common/date-range";
import type { PipelineFilter } from "./pipeline.helpers";
import type { Response } from "express";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
const WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT"] as const;

class UpdateStageDto {
  @IsEnum(STAGES)
  stage!: LeadStage;

  @IsOptional()
  @IsString()
  reason?: string;
}

class UpdateLeadDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  valueCents?: number | null;
}

class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string | null;

  @IsOptional()
  @IsString()
  ownerId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  valueCents?: number | null;
}

class CreateContactDto {
  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string | null;

  @IsOptional()
  @IsString()
  ownerId?: string | null;

  @IsOptional()
  @IsEnum(STAGES)
  stage?: LeadStage;
}

class AddNoteDto {
  @IsString()
  @MaxLength(4000)
  body!: string;
}

class DismissInsightDto {
  @IsString()
  insightId!: string;
}

class CampaignOptOutDto {
  @IsBoolean()
  optedOut!: boolean;
}

class CreateInsightTasksDto {
  @IsString()
  insightId!: string;
}

class AssignHandoffsDto {
  @IsOptional()
  @IsString()
  assignToUserId?: string;
}

@Controller("leads")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get("pipeline")
  pipeline(
    @CurrentUser() user: JwtPayload,
    @Query("filter") filter?: PipelineFilter,
    @Query("perStageLimit") perStageLimit?: string,
  ) {
    const limit = perStageLimit ? Number.parseInt(perStageLimit, 10) : 40;
    return this.leads.listByStage(user, filter, Number.isFinite(limit) ? limit : 40);
  }

  @Get("pipeline/summary")
  pipelineSummary(@CurrentUser() user: JwtPayload) {
    return this.leads.getPipelineSummary(user);
  }

  @Get("contacts")
  contacts(
    @CurrentUser() user: JwtPayload,
    @Query("q") q?: string,
    @Query("stage") stage?: LeadStage,
    @Query("tagId") tagId?: string,
    @Query("ownerId") ownerId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.leads.listContacts(user, {
      q,
      stage,
      tagId,
      ownerId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post("contacts")
  @Roles(...WRITE_ROLES)
  createContact(@CurrentUser() user: JwtPayload, @Body() dto: CreateContactDto) {
    return this.leads.createContact(user, dto);
  }

  @Get("activity")
  activity(@CurrentUser() user: JwtPayload) {
    return this.leads.getActivityFeed(user);
  }

  @Get("agent-status")
  agentStatus(@CurrentUser() user: JwtPayload) {
    return this.leads.getAgentStatus(user);
  }

  @Get("metrics/funnel")
  @RequireCapability("analytics.view.team")
  funnel(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.leads.funnelMetrics(user, period);
  }

  @Get("metrics/revenue")
  @RequireCapability("analytics.view.team")
  revenue(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.leads.getRevenueMetrics(user, period);
  }

  @Get("metrics/lost-deals")
  @RequireCapability("analytics.view.team")
  lostDeals(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.leads.lostDealMetrics(user, period);
  }

  @Get("metrics/won-deals")
  @RequireCapability("analytics.view.team")
  wonDeals(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.leads.wonDealMetrics(user, period);
  }

  @Get("metrics/insights")
  @RequireCapability("analytics.view.team")
  insights(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.leads.getInsights(user, period);
  }

  @Post("metrics/insights/dismiss")
  @Roles(...WRITE_ROLES)
  dismissInsight(@CurrentUser() user: JwtPayload, @Body() dto: DismissInsightDto) {
    return this.leads.dismissInsight(user, dto.insightId);
  }

  @Post("metrics/insights/actions/assign-handoffs")
  @RequireCapability("analytics.insights.act")
  @Roles(...WRITE_ROLES)
  assignHandoffs(@CurrentUser() user: JwtPayload, @Body() dto: AssignHandoffsDto) {
    return this.leads.assignHandoffConversations(user, dto.assignToUserId);
  }

  @Post("metrics/insights/actions/create-tasks")
  @RequireCapability("analytics.insights.act")
  @Roles(...WRITE_ROLES)
  createInsightTasks(@CurrentUser() user: JwtPayload, @Body() dto: CreateInsightTasksDto) {
    return this.leads.createInsightTasks(user, dto.insightId);
  }

  @Post("metrics/insights/actions/lead-task/:leadId")
  @Roles(...WRITE_ROLES)
  createLeadTask(@CurrentUser() user: JwtPayload, @Param("leadId") leadId: string) {
    return this.leads.createTaskForLead(user, leadId);
  }

  @Get("export")
  @RequireEmailVerified()
  @RequireCapability("contacts.export")
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query("period") period: MetricsPeriod | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.leads.exportCsv(user, period);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="growvisi-contacts.csv"');
    res.send(csv);
  }

  @Patch(":id/campaign-opt-out")
  @Roles(...WRITE_ROLES)
  setCampaignOptOut(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CampaignOptOutDto,
  ) {
    return this.leads.setCampaignOptOut(user, id, dto.optedOut);
  }

  @Get(":id/timeline")
  timeline(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.leads.getTimeline(user, id);
  }

  @Get(":id")
  contact(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.leads.getContact(user, id);
  }

  @Patch(":id/stage")
  @Roles(...WRITE_ROLES)
  updateStage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.leads.updateStage(user, id, dto.stage, dto.reason);
  }

  @Patch(":id/contact")
  @Roles(...WRITE_ROLES)
  updateContact(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.leads.updateContact(user, id, dto);
  }

  @Post(":id/notes")
  @Roles(...WRITE_ROLES)
  addNote(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: AddNoteDto) {
    return this.leads.addNote(user, id, dto.body);
  }

  @Get(":id/notes")
  listNotes(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.leads.listNotes(user, id);
  }

  @Delete(":id/notes/:noteId")
  @Roles(...WRITE_ROLES)
  deleteNote(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("noteId") noteId: string,
  ) {
    return this.leads.deleteNote(user, id, noteId);
  }

  @Patch(":id")
  @Roles(...WRITE_ROLES)
  updateLead(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.updateLead(user, id, dto);
  }
}
