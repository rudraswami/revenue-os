import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
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
  @Roles(...MANAGE_ROLES)
  preview(@CurrentUser() user: JwtPayload, @Body() dto: PreviewAudienceDto) {
    return this.campaigns.previewAudience(user, dto.audience);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.get(user, id);
  }

  @Post()
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user, dto);
  }

  @Post("import")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  import(@CurrentUser() user: JwtPayload, @Body() dto: ImportCampaignDto) {
    return this.campaigns.createFromImport(user, dto);
  }

  @Post(":id/send")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  send(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.send(user, id);
  }

  @Post(":id/schedule")
  @RequireEmailVerified()
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
  @Roles(...MANAGE_ROLES)
  cancelSchedule(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.cancelSchedule(user, id);
  }

  @Delete(":id")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.remove(user, id);
  }
}
