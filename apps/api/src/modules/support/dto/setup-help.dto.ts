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

class SetupHelpHistoryTurnDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  @MaxLength(800)
  content!: string;
}

export class SetupHelpChatDto {
  @IsIn(["onboarding", "connection", "general"])
  context!: "onboarding" | "connection" | "general";

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => SetupHelpHistoryTurnDto)
  history?: SetupHelpHistoryTurnDto[];

  @IsOptional()
  @IsIn(["en", "hi"])
  locale?: "en" | "hi";
}
