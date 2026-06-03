import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ConversationsService } from "./conversations.service";
import type { JwtPayload } from "@growthsync/shared";

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
  stats(@CurrentUser() user: JwtPayload) {
    return this.conversations.getStats(user);
  }

  @Get("capabilities")
  capabilities() {
    return this.conversations.getCapabilities();
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListQueryDto) {
    return this.conversations.list(user, query.page, query.pageSize);
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
