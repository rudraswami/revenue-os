import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Redirect,
  UseGuards,
} from "@nestjs/common";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { TrackingService } from "./tracking.service";

const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

class CreateTrackingLinkDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prefilledText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  utmContent?: string;
}

@Controller()
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get("tracking/links")
  @UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
  @Roles(...MANAGE_ROLES)
  list(@CurrentUser() user: JwtPayload) {
    return this.tracking.list(user);
  }

  @Get("tracking/metrics")
  @UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
  @Roles(...MANAGE_ROLES)
  metrics(@CurrentUser() user: JwtPayload) {
    return this.tracking.metricsByCampaign(user.organizationId);
  }

  @Post("tracking/links")
  @UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
  @Roles(...MANAGE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTrackingLinkDto) {
    return this.tracking.create(user, dto);
  }

  @Delete("tracking/links/:id")
  @UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
  @Roles(...MANAGE_ROLES)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.tracking.remove(user, id);
  }

  @Get("track/:slug")
  @Redirect()
  async redirect(@Param("slug") slug: string) {
    const { redirectUrl } = await this.tracking.redirect(slug);
    return { url: redirectUrl, statusCode: 302 };
  }
}
