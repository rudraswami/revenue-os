import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class DiscoverPhonesDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}

export class ConnectWhatsappDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @IsString()
  @IsOptional()
  wabaId?: string;
}

export class QuickConnectWhatsappDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @IsString()
  @IsOptional()
  wabaId?: string;
}

export class VerifyWhatsappCredentialsDto {
  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}

export class RefreshWhatsappTokenDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}

export class CreateWhatsappAccountDto {
  @IsString()
  @IsNotEmpty()
  phoneNumberId!: string;

  @IsString()
  @IsOptional()
  wabaId?: string;

  @IsString()
  @IsOptional()
  displayPhoneNumber?: string;

  @IsString()
  @IsOptional()
  verifiedName?: string;

  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}

export class UpdateWhatsappAccountDto {
  @IsString()
  @IsOptional()
  displayPhoneNumber?: string;

  @IsString()
  @IsOptional()
  verifiedName?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
