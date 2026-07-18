import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

class MarketingHelpHistoryTurnDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  @MaxLength(600)
  content!: string;
}

export class MarketingHelpChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(400)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => MarketingHelpHistoryTurnDto)
  history?: MarketingHelpHistoryTurnDto[];

  @IsOptional()
  @IsIn(["en", "hi"])
  locale?: "en" | "hi";

  @IsOptional()
  @IsString()
  @MaxLength(200)
  page?: string;
}
