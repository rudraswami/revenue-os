import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string)?.trim())
  name!: string;

  @IsString()
  @IsOptional()
  organizationName?: string;

  /** Join existing workspace from email invite */
  @IsString()
  @IsOptional()
  inviteToken?: string;
}

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  /** Required when user belongs to multiple workspaces */
  @IsString()
  @IsOptional()
  organizationId?: string;
}

export class RefreshTokenDto {
  /** Optional: the refresh token is normally read from the HttpOnly cookie. */
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class LogoutDto {
  /** Optional: the refresh token is normally read from the HttpOnly cookie. */
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @Transform(({ value }) => (value as string)?.trim().toLowerCase())
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(64)
  @MaxLength(64)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  /** User must type DELETE to confirm */
  @IsString()
  @IsNotEmpty()
  confirmation!: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (value as string)?.trim())
  name!: string;

  @IsOptional()
  @IsEnum(["en", "hi"])
  locale?: "en" | "hi";
}

export class SwitchOrganizationDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}
