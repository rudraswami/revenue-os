import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CompleteEmbeddedSignupDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @IsString()
  @IsNotEmpty()
  wabaId!: string;

  @IsString()
  @IsOptional()
  finishEvent?: string;
}
