import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { KNOWLEDGE_MAX_CONTENT_CHARS, KNOWLEDGE_MAX_UPLOAD_BYTES } from "@growvisi/shared";
import { KnowledgeParseService } from "./knowledge-parse.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireCapability } from "../../common/decorators/require-capability.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload, KnowledgeCategory } from "@growvisi/shared";
import { KNOWLEDGE_CATEGORIES } from "@growvisi/shared";
import { KnowledgeService } from "./knowledge.service";

const MANAGE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(KNOWLEDGE_MAX_CONTENT_CHARS)
  content!: string;

  @IsOptional()
  @IsString()
  @IsIn(KNOWLEDGE_CATEGORIES as unknown as string[])
  category?: KnowledgeCategory;
}

class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(KNOWLEDGE_MAX_CONTENT_CHARS)
  content?: string;

  @IsOptional()
  @IsString()
  @IsIn(KNOWLEDGE_CATEGORIES as unknown as string[])
  category?: KnowledgeCategory;
}

class RetrieveTestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query!: string;
}

@Controller("knowledge")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly parse: KnowledgeParseService,
  ) {}

  @Get("documents")
  @RequireCapability("knowledge.manage")
  list(@CurrentUser() user: JwtPayload) {
    return this.knowledge.list(user);
  }

  @Post("documents")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDocumentDto) {
    return this.knowledge.create(user, dto.title, dto.content, dto.category ?? "general");
  }

  @Post("documents/upload")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: KNOWLEDGE_MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body("title") title?: string,
    @Body("category") category?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded.");
    }
    const parsed = await this.parse.parseUpload(file);
    const resolvedCategory = KNOWLEDGE_CATEGORIES.includes(category as KnowledgeCategory)
      ? (category as KnowledgeCategory)
      : "general";
    const resolvedTitle = title?.trim() || this.parse.titleFromFilename(parsed.filename);
    const doc = await this.knowledge.create(user, resolvedTitle, parsed.text, resolvedCategory, {
      sourceType: "upload",
      sourceUrl: parsed.filename,
    });
    return { ...doc, truncated: parsed.truncated };
  }

  @Patch("documents/:id")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateDocumentDto) {
    return this.knowledge.update(user, id, {
      title: dto.title,
      content: dto.content,
      category: dto.category,
    });
  }

  @Delete("documents/:id")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.knowledge.remove(user, id);
  }

  @Post("documents/reindex-all")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  reindexAll(@CurrentUser() user: JwtPayload) {
    return this.knowledge.reindexAll(user);
  }

  @Post("documents/:id/reindex")
  @RequireEmailVerified()
  @Roles(...MANAGE_ROLES)
  reindex(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.knowledge.reindex(user, id);
  }

  @Post("retrieve")
  @RequireCapability("knowledge.manage")
  testRetrieve(@CurrentUser() user: JwtPayload, @Body() dto: RetrieveTestDto) {
    return this.knowledge.testRetrieve(user, dto.query);
  }

  @Get("health")
  @RequireCapability("knowledge.manage")
  health(@CurrentUser() user: JwtPayload) {
    return this.knowledge.health(user);
  }
}
