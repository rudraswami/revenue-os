import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import type { MessageTemplateCategory } from "@growvisi/shared";

export class CreateMessageTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(12)
  language!: string;

  @IsIn(["MARKETING", "UTILITY", "AUTHENTICATION"])
  category!: MessageTemplateCategory;

  @IsString()
  @MinLength(10)
  @MaxLength(1024)
  body!: string;

  /** Optional starter id for analytics — not sent to Meta */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  starterId?: string;
}
