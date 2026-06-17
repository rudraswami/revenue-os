import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class ContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  company!: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  team?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  message?: string;
}
