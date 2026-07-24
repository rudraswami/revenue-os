import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import type { MessageTemplateCategory } from "@growvisi/shared";

export class UpdateMessageTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(12)
  language!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  metaTemplateId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1024)
  body!: string;

  @IsOptional()
  @IsIn(["MARKETING", "UTILITY", "AUTHENTICATION"])
  category?: MessageTemplateCategory;
}
