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

  /** Meta App Review demo owner — full Pro entitlements, never subscription-gated. */
  @IsString()
  @IsOptional()
  META_REVIEWER_EMAIL?: string;

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

  /** Parent domain for refresh cookie (e.g. `.growvisi.in` for www ↔ api). */
  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;
}

function isProductionEnv(config: Record<string, unknown>): boolean {
  return config.VERCEL_ENV === "production" || config.NODE_ENV === "production";
}

function requireProdSecret(label: string, value: unknown, missing: string[]): void {
  if (!value || (typeof value === "string" && !value.trim())) {
    missing.push(label);
  }
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

  const isProd = isProductionEnv(config);
  if (isProd) {
    const cookieDomain = String(config.COOKIE_DOMAIN ?? "")
      .replace(/\r/g, "")
      .trim();
    if (!cookieDomain) {
      // eslint-disable-next-line no-console
      console.warn(
        "[env] COOKIE_DOMAIN is not set — refresh cookies will not be shared across " +
          "subdomains (www.growvisi.in ↔ api.growvisi.in). Users may be logged out after access JWT expiry.",
      );
    } else if (!cookieDomain.startsWith(".")) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] COOKIE_DOMAIN="${cookieDomain}" should start with "." (e.g. .growvisi.in) for subdomain sharing.`,
      );
    }

    const missingRequired: string[] = [];
    requireProdSecret(
      "WHATSAPP_APP_SECRET or META_APP_SECRET",
      validated.WHATSAPP_APP_SECRET ?? validated.META_APP_SECRET,
      missingRequired,
    );
    requireProdSecret("WHATSAPP_VERIFY_TOKEN", validated.WHATSAPP_VERIFY_TOKEN, missingRequired);
    requireProdSecret("CRON_SECRET", validated.CRON_SECRET, missingRequired);
    requireProdSecret("TOKEN_ENCRYPTION_KEY", validated.TOKEN_ENCRYPTION_KEY, missingRequired);
    requireProdSecret("OPENAI_API_KEY", config.OPENAI_API_KEY, missingRequired);

    if (missingRequired.length > 0) {
      throw new Error(
        `[env] Production deploy is missing required secrets: ${missingRequired.join(", ")}. ` +
          "Set these in Vercel before promoting to production.",
      );
    }

    const recommended: Array<[string, unknown]> = [
      ["RAZORPAY_WEBHOOK_SECRET", config.RAZORPAY_WEBHOOK_SECRET],
      ["RAZORPAY_KEY_ID", config.RAZORPAY_KEY_ID],
    ];
    const missingRecommended = recommended.filter(([, v]) => !v).map(([k]) => k);
    if (missingRecommended.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] Production deploy is missing recommended billing secrets: ${missingRecommended.join(", ")}. ` +
          "Paid upgrades will not work until Razorpay is configured.",
      );
    }
  }

  return validated;
}
