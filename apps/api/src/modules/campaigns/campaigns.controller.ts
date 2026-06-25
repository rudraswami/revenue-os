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
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
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
}

@Controller("campaigns")
@UseGuards(JwtAuthGuard, MembershipRoleGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.campaigns.list(user);
  }

  @Post("preview")
  @Roles(...MANAGE_ROLES)
  preview(@CurrentUser() user: JwtPayload, @Body() dto: PreviewAudienceDto) {
    return this.campaigns.previewAudience(user, dto.audience);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.get(user, id);
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user, dto);
  }

  @Post("import")
  @Roles(...MANAGE_ROLES)
  import(@CurrentUser() user: JwtPayload, @Body() dto: ImportCampaignDto) {
    return this.campaigns.createFromImport(user, dto);
  }

  @Post(":id/send")
  @Roles(...MANAGE_ROLES)
  send(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.send(user, id);
  }

  @Delete(":id")
  @Roles(...MANAGE_ROLES)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.campaigns.remove(user, id);
  }
}
