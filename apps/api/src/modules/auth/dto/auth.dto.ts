import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
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
  email!: string;

  @IsString()
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
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class DeleteAccountDto {
  @IsString()
  password!: string;

  /** User must type DELETE to confirm */
  @IsString()
  @IsNotEmpty()
  confirmation!: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  name?: string;
}
