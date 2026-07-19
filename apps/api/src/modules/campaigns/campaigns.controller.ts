import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireCapability } from "../../common/decorators/require-capability.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import { CampaignsService } from "./campaigns.service";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;
const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

class AudienceDto {
  @IsOptional()
  @IsArray()
  @IsEnum(STAGES, { each: true })
  stages?: LeadStage[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;
}

class PreviewAudienceDto {
  @ValidateNested()
  @Type(() => AudienceDto)
  audience!: AudienceDto;
}

class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  messageBody?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateParams?: string[];

  @ValidateNested()
  @Type(() => AudienceDto)
  audience!: AudienceDto;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsString()
  whatsappAccountId?: string | null;
}

class ImportRecipientDto {
  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  name?: string | null;
}

class ImportCampaignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  templateName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  languageCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  messageBody?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateParams?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRecipientDto)
  recipients!: ImportRecipientDto[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  @IsOptional()
  @IsString()
  whatsappAccountId?: string | null;
}

class ScheduleCampaignDto {
  @IsDateString()
  scheduledAt!: string;
}

@Controller("campaigns")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.campaigns.list(user);
  }

  @Post("preview")
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  preview(@CurrentUser() user: JwtPayload, @Body() dto: PreviewAudienceDto) {
    return this.campaigns.previewAudience(user, dto.audience);
  }

  @Get("metrics/replies")
  replyMetrics(@CurrentUser() user: JwtPayload) {
    return this.campaigns.getReplyMetrics(user);
  }

  @Get(":id/export")
  exportRecipients(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    return this.campaigns.exportRecipientsCsv(user, id).then((csv) => {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="growvisi-campaign-${id.slice(0, 8)}-recipients.csv"`,
      );
      res.send(csv);
    });
  }

  @Get(":id/progress")
  progress(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.getProgress(user, id);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.get(user, id);
  }

  @Post()
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user, dto);
  }

  @Post("import")
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  import(@CurrentUser() user: JwtPayload, @Body() dto: ImportCampaignDto) {
    return this.campaigns.createFromImport(user, dto);
  }

  @Post(":id/retry-failed")
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  retryFailed(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.retryFailed(user, id);
  }

  @Post(":id/send")
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  send(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.send(user, id);
  }

  @Post(":id/schedule")
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  schedule(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaigns.schedule(user, id, dto.scheduledAt);
  }

  @Post(":id/cancel-schedule")
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  cancelSchedule(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.cancelSchedule(user, id);
  }

  @Delete(":id")
  @RequireEmailVerified()
  @RequireCapability("campaigns.manage")
  @Roles(...MANAGE_ROLES)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.remove(user, id);
  }
}
