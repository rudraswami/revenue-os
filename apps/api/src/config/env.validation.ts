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
  @IsOptional()
  REDIS_URL?: string;

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

/** True only for live production — not Vercel preview or local dev. */
export function isStrictProductionEnv(config: Record<string, unknown>): boolean {
  const onVercel = config.VERCEL === "1" || config.VERCEL === true;
  if (onVercel) {
    return config.VERCEL_ENV === "production";
  }
  return config.NODE_ENV === "production";
}

function requireProdSecret(label: string, value: unknown, missing: string[]): void {
  if (!value || (typeof value === "string" && !value.trim())) {
    missing.push(label);
  }
}

function sanitizeEnvString(value: unknown): string {
  return String(value ?? "")
    .replace(/\r/g, "")
    .trim();
}

/** Validates COOKIE_DOMAIN format for cross-subdomain refresh cookies. */
export function validateCookieDomain(value: unknown): string {
  const domain = sanitizeEnvString(value);
  if (!domain) {
    throw new Error(
      "[env] COOKIE_DOMAIN is required in production (e.g. .growvisi.in) so refresh " +
        "cookies work across www.growvisi.in and api.growvisi.in.",
    );
  }
  if (!domain.startsWith(".")) {
    throw new Error(
      `[env] COOKIE_DOMAIN="${domain}" must start with "." (e.g. .growvisi.in) for subdomain cookie sharing.`,
    );
  }
  if (domain.includes("://") || domain.includes("/")) {
    throw new Error(
      `[env] COOKIE_DOMAIN must be a bare domain like .growvisi.in — not a URL.`,
    );
  }
  return domain;
}

/** Validates REDIS_URL for production queue offload (Upstash on Vercel). */
export function validateProductionRedisUrl(value: unknown, onVercel: boolean): string {
  const url = sanitizeEnvString(value);
  if (!url) {
    throw new Error(
      "[env] REDIS_URL is required in production — BullMQ queues for inbound WhatsApp " +
        "and AI classify/embed run through Redis (Upstash rediss:// on Vercel). " +
        "Without it, work runs inline in webhook handlers and can time out.",
    );
  }
  const lower = url.toLowerCase();
  if (lower.includes("localhost") || lower.includes("127.0.0.1")) {
    throw new Error("[env] REDIS_URL cannot point to localhost in production.");
  }
  if (onVercel && !lower.startsWith("rediss://") && !lower.startsWith("redis://")) {
    throw new Error("[env] REDIS_URL must be a valid redis:// or rediss:// URL.");
  }
  if (onVercel && lower.startsWith("redis://") && !lower.includes("upstash")) {
    // eslint-disable-next-line no-console
    console.warn(
      "[env] REDIS_URL uses redis:// on Vercel — prefer Upstash rediss:// for TLS.",
    );
  }
  return url;
}

/** Validates CRON_SECRET for Vercel Cron routes in vercel.json. */
export function validateCronSecret(value: unknown): string {
  const secret = sanitizeEnvString(value);
  if (!secret) {
    throw new Error(
      "[env] CRON_SECRET is required in production — Vercel cron jobs in vercel.json " +
        "(token refresh, campaigns, digest, retention) authenticate with this secret. " +
        "Generate: openssl rand -base64 32",
    );
  }
  if (secret.length < 16) {
    throw new Error("[env] CRON_SECRET must be at least 16 characters.");
  }
  return secret;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const isProd = isStrictProductionEnv(config);
  const onVercel = config.VERCEL === "1" || config.VERCEL === true;

  if (isProd) {
    const jwtSecret = sanitizeEnvString(validated.JWT_SECRET);
    if (jwtSecret.length < 32) {
      throw new Error(
        "[env] JWT_SECRET must be at least 32 characters in production. " +
          "Generate: openssl rand -base64 32",
      );
    }

    validateCookieDomain(config.COOKIE_DOMAIN);
    validateProductionRedisUrl(config.REDIS_URL, onVercel);
    validateCronSecret(config.CRON_SECRET);

    const missingRequired: string[] = [];
    requireProdSecret(
      "WHATSAPP_APP_SECRET or META_APP_SECRET",
      validated.WHATSAPP_APP_SECRET ?? validated.META_APP_SECRET,
      missingRequired,
    );
    requireProdSecret("WHATSAPP_VERIFY_TOKEN", validated.WHATSAPP_VERIFY_TOKEN, missingRequired);

    if (missingRequired.length > 0) {
      throw new Error(
        `[env] Production deploy is missing required secrets: ${missingRequired.join(", ")}. ` +
          "Set these in Vercel before promoting to production.",
      );
    }

    const razorpayKeyId = sanitizeEnvString(config.RAZORPAY_KEY_ID);
    if (razorpayKeyId) {
      const razorpayMissing: string[] = [];
      requireProdSecret("RAZORPAY_KEY_SECRET", config.RAZORPAY_KEY_SECRET, razorpayMissing);
      requireProdSecret("RAZORPAY_PLAN_STARTER", config.RAZORPAY_PLAN_STARTER, razorpayMissing);
      requireProdSecret("RAZORPAY_PLAN_GROWTH", config.RAZORPAY_PLAN_GROWTH, razorpayMissing);
      requireProdSecret("RAZORPAY_PLAN_PRO", config.RAZORPAY_PLAN_PRO, razorpayMissing);
      requireProdSecret("RAZORPAY_WEBHOOK_SECRET", config.RAZORPAY_WEBHOOK_SECRET, razorpayMissing);
      if (razorpayMissing.length > 0) {
        throw new Error(
          `[env] RAZORPAY_KEY_ID is set but billing is incomplete: ${razorpayMissing.join(", ")}. ` +
            "Add all Razorpay plan IDs and webhook secret, or remove RAZORPAY_KEY_ID until ready.",
        );
      }
    }

    const missingRecommended: Array<[string, unknown]> = [
      ["TOKEN_ENCRYPTION_KEY", config.TOKEN_ENCRYPTION_KEY],
      ["OPENAI_API_KEY", config.OPENAI_API_KEY],
      ["RAZORPAY_WEBHOOK_SECRET", config.RAZORPAY_WEBHOOK_SECRET],
      ["RAZORPAY_KEY_ID", config.RAZORPAY_KEY_ID],
      ["WEBHOOK_PUBLIC_URL", config.WEBHOOK_PUBLIC_URL],
      ["CORS_ORIGINS", config.CORS_ORIGINS],
    ];
    const missingRecommendedLabels = missingRecommended.filter(([, v]) => !v).map(([k]) => k);
    if (missingRecommendedLabels.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] Production is missing recommended secrets: ${missingRecommendedLabels.join(", ")}. ` +
          "Some features (AI, billing, CORS) may be degraded until set.",
      );
    }

    if (!config.TOKEN_ENCRYPTION_KEY && validated.JWT_SECRET) {
      // eslint-disable-next-line no-console
      console.warn(
        "[env] TOKEN_ENCRYPTION_KEY not set — using JWT_SECRET for WhatsApp token encryption. " +
          "Set a dedicated TOKEN_ENCRYPTION_KEY so JWT rotation does not break stored tokens.",
      );
    }
  } else if ((validated.JWT_SECRET ?? "").length < 32) {
    // eslint-disable-next-line no-console
    console.warn(
      "[env] JWT_SECRET is shorter than 32 characters — use a longer random secret in production.",
    );
  }

  return validated;
}
