import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import type { WebhookEventType } from "../organizations/webhook-settings";
import { WebhookDispatchService } from "./webhook-dispatch.service";

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;
const EVENTS = ["lead.stage.changed", "lead.created"] as const;

class CreateWebhookDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsUrl({ require_protocol: true, protocols: ["https"] })
  url!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(EVENTS, { each: true })
  events?: WebhookEventType[];
}

class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ["https"] })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(EVENTS, { each: true })
  events?: WebhookEventType[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

@Controller("webhooks")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhookDispatchService) {}

  @Get()
  @Roles(...ADMIN_ROLES)
  list(@CurrentUser() user: JwtPayload) {
    return this.webhooks.list(user);
  }

  @Post()
  @RequireEmailVerified()
  @Roles(...ADMIN_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWebhookDto) {
    return this.webhooks.createEndpoint(user, {
      name: dto.name,
      url: dto.url,
      events: dto.events ?? ["lead.stage.changed"],
    });
  }

  @Patch(":id")
  @RequireEmailVerified()
  @Roles(...ADMIN_ROLES)
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooks.updateEndpoint(user, id, dto);
  }

  @Delete(":id")
  @RequireEmailVerified()
  @Roles(...ADMIN_ROLES)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.webhooks.removeEndpoint(user, id);
  }

  @Post(":id/test")
  @RequireEmailVerified()
  @Roles(...ADMIN_ROLES)
  test(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.webhooks.sendTest(user, id);
  }
}
