import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { KnowledgeService } from "./knowledge.service";

const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  content!: string;
}

class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;
}

@Controller("knowledge/documents")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.knowledge.list(user);
  }

  @Post()
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDocumentDto) {
    return this.knowledge.create(user, dto.title, dto.content);
  }

  @Patch(":id")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateDocumentDto) {
    return this.knowledge.update(user, id, {
      title: dto.title,
      content: dto.content,
    });
  }

  @Delete(":id")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.knowledge.remove(user, id);
  }

  @Post(":id/reindex")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  reindex(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.knowledge.reindex(user, id);
  }
}
