import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class DeleteMessageTemplateQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(12)
  language!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  metaTemplateId?: string;
}
