import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireCapability } from "../../common/decorators/require-capability.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { MetricsPeriod } from "../../common/date-range";
import { ConversationsService } from "./conversations.service";
import type { JwtPayload, LeadStage } from "@growvisi/shared";

const WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT"] as const;
const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  filter?: string;

  @IsOptional()
  @IsString()
  @IsIn(["active", "closed"])
  scope?: string;
}

class AssignDto {
  @IsOptional()
  @IsString()
  assignToUserId?: string | null;
}

class ToggleAiDto {
  @IsBoolean()
  aiEnabled!: boolean;
}

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  draftText?: string;

  @IsOptional()
  @IsString()
  aiRunId?: string;
}

class TakeoverDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  taskTitle?: string;
}

class AiCorrectionDto {
  @IsOptional()
  @IsIn(STAGES)
  stage?: LeadStage;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsBoolean()
  requiresHuman?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  intent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class StartOutboundDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageCode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateParams?: string[];
}

@Controller("conversations")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get("stats")
  @RequireCapability("inbox.reply")
  stats(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.conversations.getStats(user, period);
  }

  @Get("capabilities")
  capabilities() {
    return this.conversations.getCapabilities();
  }

  @Get("metrics/sla")
  @RequireCapability("analytics.view.team")
  slaMetrics(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.conversations.getSlaMetrics(user, period);
  }

  @Get()
  @RequireCapability("inbox.reply")
  list(@CurrentUser() user: JwtPayload, @Query() query: ListQueryDto) {
    return this.conversations.list(user, query.page, query.pageSize, query.q, query.filter, query.scope);
  }

  @Post("outbound")
  @Roles(...WRITE_ROLES)
  startOutbound(@CurrentUser() user: JwtPayload, @Body() dto: StartOutboundDto) {
    return this.conversations.startOutbound(user, dto);
  }

  @Get(":id/messages/:messageId/media")
  async messageMedia(
    @CurrentUser() user: JwtPayload,
    @Param("id") conversationId: string,
    @Param("messageId") messageId: string,
    @Res() res: Response,
  ) {
    const media = await this.conversations.streamMessageMedia(user, conversationId, messageId);
    res.setHeader("Content-Type", media.contentType);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(Buffer.from(media.data));
  }

  @Get(":id")
  @RequireCapability("inbox.reply")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.getById(user, id);
  }

  @Post(":id/messages")
  @Roles(...WRITE_ROLES)
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.sendMessage(user, id, dto.content, {
      draftText: dto.draftText,
      aiRunId: dto.aiRunId,
    });
  }

  @Get(":id/intelligence")
  @RequireCapability("inbox.reply")
  getIntelligence(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.getIntelligence(user, id);
  }

  @Get(":id/reply-decision")
  @RequireCapability("inbox.reply")
  getReplyDecision(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.getReplyDecision(user, id);
  }

  @Post(":id/suggest-reply")
  @Roles(...WRITE_ROLES)
  suggestReply(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.suggestReply(user, id);
  }

  @Post(":id/read")
  @Roles(...WRITE_ROLES)
  markRead(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.markRead(user, id);
  }

  @Post(":id/resolve-handoff")
  @Roles(...WRITE_ROLES)
  resolveHandoff(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.resolveHandoff(user, id);
  }

  @Post(":id/ai-correction")
  @Roles(...WRITE_ROLES)
  correctAi(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: AiCorrectionDto,
  ) {
    return this.conversations.correctAiClassification(user, id, dto);
  }

  @Post(":id/takeover")
  @Roles(...WRITE_ROLES)
  takeover(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: TakeoverDto,
  ) {
    return this.conversations.takeover(user, id, dto.taskTitle);
  }

  @Patch(":id/assign")
  @Roles(...WRITE_ROLES)
  assign(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: AssignDto) {
    return this.conversations.assign(user, id, dto.assignToUserId ?? null);
  }

  @Patch(":id/ai")
  @RequireCapability("inbox.ai.toggle")
  @Roles("OWNER", "ADMIN", "MANAGER")
  toggleAi(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: ToggleAiDto) {
    return this.conversations.toggleAi(user, id, dto.aiEnabled);
  }
}
