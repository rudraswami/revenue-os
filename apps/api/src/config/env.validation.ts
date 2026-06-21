import { plainToInstance } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  /** Supabase direct connection (port 5432) — used by Prisma migrate / db push */
  @IsString()
  @IsNotEmpty()
  DIRECT_URL!: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsOptional()
  SUPABASE_URL?: string;

  @IsString()
  @IsOptional()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_VERIFY_TOKEN?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_APP_SECRET?: string;

  @IsString()
  @IsOptional()
  WEBHOOK_PUBLIC_URL?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_API_VERSION?: string;

  @IsString()
  @IsOptional()
  META_APP_ID?: string;

  @IsString()
  @IsOptional()
  META_APP_SECRET?: string;

  @IsString()
  @IsOptional()
  META_EMBEDDED_SIGNUP_CONFIG_ID?: string;

  /** Set WHATSAPP_EMBEDDED_SIGNUP_LIVE=false to hide one-click Facebook connect (enabled by default). */
  @IsString()
  @IsOptional()
  WHATSAPP_EMBEDDED_SIGNUP_LIVE?: string;

  @IsString()
  @IsOptional()
  META_WABA_REGISTER_PIN?: string;

  @IsString()
  @IsOptional()
  RAZORPAY_KEY_ID?: string;

  @IsString()
  @IsOptional()
  RAZORPAY_KEY_SECRET?: string;

  @IsString()
  @IsOptional()
  RAZORPAY_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  RAZORPAY_PLAN_STARTER?: string;

  @IsString()
  @IsOptional()
  RAZORPAY_PLAN_GROWTH?: string;

  @IsString()
  @IsOptional()
  RAZORPAY_PLAN_PRO?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}
