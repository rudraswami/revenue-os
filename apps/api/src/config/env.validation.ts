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

  /** Dedicated key for encrypting WhatsApp tokens at rest (falls back to JWT_SECRET). */
  @IsString()
  @IsOptional()
  TOKEN_ENCRYPTION_KEY?: string;

  /** Shared secret protecting internal cron endpoints. */
  @IsString()
  @IsOptional()
  CRON_SECRET?: string;

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

  if ((validated.JWT_SECRET ?? "").length < 32) {
    // eslint-disable-next-line no-console
    console.warn(
      "[env] JWT_SECRET is shorter than 32 characters — use a longer random secret in production.",
    );
  }

  const isProd = config.NODE_ENV === "production" || config.VERCEL === "1";
  if (isProd) {
    const recommended: Array<[string, unknown]> = [
      ["WHATSAPP_APP_SECRET / META_APP_SECRET", validated.WHATSAPP_APP_SECRET ?? validated.META_APP_SECRET],
      ["WHATSAPP_VERIFY_TOKEN", validated.WHATSAPP_VERIFY_TOKEN],
      ["RAZORPAY_WEBHOOK_SECRET", config.RAZORPAY_WEBHOOK_SECRET],
      ["TOKEN_ENCRYPTION_KEY", validated.TOKEN_ENCRYPTION_KEY],
      ["CRON_SECRET", validated.CRON_SECRET],
    ];
    const missing = recommended.filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] Production deploy is missing recommended secrets: ${missing.join(", ")}. ` +
          `Webhooks fail closed and tokens fall back to JWT_SECRET until these are set.`,
      );
    }
  }

  return validated;
}
