import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { TagsService } from "./tags.service";

class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

@Controller("tags")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.tags.list(user);
  }

  @Post()
  @Roles("OWNER", "ADMIN", "MANAGER", "AGENT")
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTagDto) {
    return this.tags.create(user, dto.name, dto.color);
  }

  @Patch(":id")
  @Roles("OWNER", "ADMIN", "MANAGER", "AGENT")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateTagDto) {
    return this.tags.update(user, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN", "MANAGER")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.tags.remove(user, id);
  }

  @Post("leads/:leadId/:tagId")
  @Roles("OWNER", "ADMIN", "MANAGER", "AGENT")
  assign(
    @CurrentUser() user: JwtPayload,
    @Param("leadId") leadId: string,
    @Param("tagId") tagId: string,
  ) {
    return this.tags.assignToLead(user, leadId, tagId);
  }

  @Delete("leads/:leadId/:tagId")
  @Roles("OWNER", "ADMIN", "MANAGER", "AGENT")
  unassign(
    @CurrentUser() user: JwtPayload,
    @Param("leadId") leadId: string,
    @Param("tagId") tagId: string,
  ) {
    return this.tags.unassignFromLead(user, leadId, tagId);
  }
}
