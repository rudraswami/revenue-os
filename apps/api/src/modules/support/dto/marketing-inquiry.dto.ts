import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class MarketingInquiryDto {
  @IsIn(["whatsapp_click"])
  kind!: "whatsapp_click";

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  page?: string;

  @IsOptional()
  @IsIn(["en", "hi"])
  locale?: "en" | "hi";

  @IsOptional()
  @IsIn(["sales", "enterprise"])
  inquiryKind?: "sales" | "enterprise";
}
