import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { RequireCapability } from "../../common/decorators/require-capability.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { WebsiteImportService } from "./website-import.service";

const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

class StartImportDto {
  @IsString()
  @IsNotEmpty({ message: "URL is required" })
  @MaxLength(2000)
  url!: string;
}

class ApproveItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  itemIds!: string[];
}

class DismissItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  itemIds!: string[];
}

class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000)
  content?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

@Controller("knowledge/imports")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class WebsiteImportController {
  constructor(private readonly importService: WebsiteImportService) {}

  @Get()
  @RequireCapability("knowledge.manage")
  list(@CurrentUser() user: JwtPayload) {
    return this.importService.listImports(user);
  }

  @Post()
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  start(@CurrentUser() user: JwtPayload, @Body() dto: StartImportDto) {
    return this.importService.startImport(user, dto.url);
  }

  @Get(":id")
  @RequireCapability("knowledge.manage")
  get(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.importService.getImport(user, id);
  }

  @Post(":id/approve")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  approve(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ApproveItemsDto,
  ) {
    return this.importService.approveItems(user, id, dto.itemIds);
  }

  @Post(":id/approve-all")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  approveAll(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.importService.approveAll(user, id);
  }

  @Post(":id/dismiss")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  dismiss(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: DismissItemsDto,
  ) {
    return this.importService.dismissItems(user, id, dto.itemIds);
  }

  @Patch(":id/items/:itemId")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.importService.updateItem(user, id, itemId, dto);
  }

  @Post(":id/resync")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  resync(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.importService.resync(user, id);
  }

  @Delete(":id")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  cancel(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.importService.cancelImport(user, id);
  }
}
