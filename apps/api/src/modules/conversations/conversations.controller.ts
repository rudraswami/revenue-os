import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { MetricsPeriod } from "../../common/date-range";
import { ConversationsService } from "./conversations.service";
import type { JwtPayload } from "@growvisi/shared";

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
}

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get("stats")
  stats(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.conversations.getStats(user, period);
  }

  @Get("capabilities")
  capabilities() {
    return this.conversations.getCapabilities();
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListQueryDto) {
    return this.conversations.list(user, query.page, query.pageSize, query.q);
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
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.getById(user, id);
  }

  @Post(":id/messages")
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.sendMessage(user, id, dto.content);
  }

  @Post(":id/suggest-reply")
  suggestReply(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.conversations.suggestReply(user, id);
  }

  @Patch(":id/assign")
  assign(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: AssignDto) {
    return this.conversations.assign(user, id, dto.assignToUserId ?? null);
  }

  @Patch(":id/ai")
  toggleAi(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: ToggleAiDto) {
    return this.conversations.toggleAi(user, id, dto.aiEnabled);
  }
}
