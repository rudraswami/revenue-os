#!/usr/bin/env node
/**
 * Sync production env vars to Vercel API + Web from local .env files.
 * Merges: .env → .env.local → .env.supabase.new (later wins).
 *
 * Usage: node scripts/set-vercel-production-env.js
 * Requires: vercel CLI linked to rudraswami-s-projects/revenue-os-api and revenue-os-web
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const apiDir = path.join(root, "apps", "api");
const webDir = path.join(root, "apps", "web");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v.replace(/\\r\\n/g, "").replace(/[\r\n]+/g, "").trim();
  }
  return out;
}

function mergeEnv() {
  const base = {
    ...loadEnvFile(path.join(root, ".env")),
    ...loadEnvFile(path.join(root, ".env.local")),
    ...loadEnvFile(path.join(root, ".env.supabase.new")),
  };
  // Pooler URL from .env must win for Vercel runtime — .env.supabase.new often has direct :5432 only.
  const poolerDb = loadEnvFile(path.join(root, ".env")).DATABASE_URL;
  if (poolerDb?.includes("pooler") || poolerDb?.includes(":6543")) {
    base.DATABASE_URL = poolerDb;
  }
  return base;
}

function run(cmd, input) {
  execSync(cmd, {
    stdio: input !== undefined ? ["pipe", "inherit", "inherit"] : "inherit",
    input,
    shell: true,
    cwd: process.cwd(),
  });
}

function setEnv(cwd, name, value, environment = "production") {
  if (value === undefined || value === null || String(value).trim() === "") {
    console.log(`  skip ${name} (empty)`);
    return false;
  }
  const clean = String(value).replace(/[\r\n]+/g, "").trim();
  process.chdir(cwd);
  try {
    run(`vercel env rm ${name} ${environment} --yes`);
  } catch {
    /* may not exist */
  }
  run(`vercel env add ${name} ${environment}`, clean);
  console.log(`  ✓ ${path.basename(cwd)} ${environment} ${name}`);
  return true;
}

function removeEnv(cwd, name, environment = "production") {
  process.chdir(cwd);
  try {
    run(`vercel env rm ${name} ${environment} --yes`);
    console.log(`  ✗ removed ${path.basename(cwd)} ${environment} ${name}`);
    return true;
  } catch {
    return false;
  }
}

const env = mergeEnv();

// Never auto-generate secrets — only push values present locally (skip empty).

// Production constants (growvisi.in primary; .com parallel — see docs/DUAL-DOMAIN-SETUP.md)
const DOMAIN = {
  WEB: "https://www.growvisi.in",
  API: "https://api.growvisi.in",
  CORS:
    "https://growvisi.in,https://www.growvisi.in,https://growvisi.com,https://www.growvisi.com",
  COOKIE: ".growvisi.in",
};

console.log("\n═══ Vercel API (revenue-os-api) production ═══\n");

const API_VARS = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: DOMAIN.WEB,
  CORS_ORIGINS: DOMAIN.CORS,
  WEBHOOK_PUBLIC_URL: DOMAIN.API,
  QSTASH_CALLBACK_URL: env.QSTASH_CALLBACK_URL || DOMAIN.API,
  COOKIE_DOMAIN: DOMAIN.COOKIE,
  EMAIL_VERIFICATION_REQUIRED: env.EMAIL_VERIFICATION_REQUIRED || "true",
  EMAIL_FROM: env.EMAIL_FROM || "Growvisi <it@growvisi.in>",
  WHATSAPP_API_VERSION: env.WHATSAPP_API_VERSION || "v21.0",
  WHATSAPP_EMBEDDED_SIGNUP_LIVE: env.WHATSAPP_EMBEDDED_SIGNUP_LIVE || "true",
  LATENCY_PROBE_ENABLED: "false",
  JWT_ACCESS_EXPIRES_IN: env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN || "7d",
  AI_CHAT_MODEL: env.AI_CHAT_MODEL || "gpt-4o-mini",
  AI_CLASSIFY_MODEL: env.AI_CLASSIFY_MODEL || "gpt-4o-mini",
  AI_EMBEDDING_MODEL: env.AI_EMBEDDING_MODEL || "text-embedding-3-small",
  // From local env (skip if empty — may already exist on Vercel)
  DATABASE_URL: env.DATABASE_URL,
  DIRECT_URL: env.DIRECT_URL,
  REDIS_URL: env.REDIS_URL,
  QSTASH_TOKEN: env.QSTASH_TOKEN,
  QSTASH_CURRENT_SIGNING_KEY: env.QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY: env.QSTASH_NEXT_SIGNING_KEY,
  JWT_SECRET: env.JWT_SECRET,
  CRON_SECRET: env.CRON_SECRET,
  TOKEN_ENCRYPTION_KEY: env.TOKEN_ENCRYPTION_KEY,
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  RESEND_API_KEY: env.RESEND_API_KEY,
  META_APP_ID: env.META_APP_ID,
  META_APP_SECRET: env.META_APP_SECRET,
  META_EMBEDDED_SIGNUP_CONFIG_ID: env.META_EMBEDDED_SIGNUP_CONFIG_ID,
  WHATSAPP_VERIFY_TOKEN: env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET: env.WHATSAPP_APP_SECRET || env.META_APP_SECRET,
  SENTRY_DSN: env.SENTRY_DSN,
  RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: env.RAZORPAY_WEBHOOK_SECRET,
  RAZORPAY_PLAN_STARTER: env.RAZORPAY_PLAN_STARTER,
  RAZORPAY_PLAN_GROWTH: env.RAZORPAY_PLAN_GROWTH,
  RAZORPAY_PLAN_PRO: env.RAZORPAY_PLAN_PRO,
  SUPABASE_URL: env.SUPABASE_URL,
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
};

for (const [key, value] of Object.entries(API_VARS)) {
  setEnv(apiDir, key, value);
}

// Remove seed credentials from production (security)
for (const seedKey of ["SEED_USER_EMAIL", "SEED_USER_PASSWORD", "SEED_ORG_NAME"]) {
  removeEnv(apiDir, seedKey, "production");
}

console.log("\n═══ Vercel Web (revenue-os-web) production ═══\n");

const WEB_VARS = {
  NEXT_PUBLIC_APP_URL: DOMAIN.WEB,
  NEXT_PUBLIC_API_URL: `${DOMAIN.API}/api/v1`,
  NEXT_PUBLIC_WS_URL: `wss://api.growvisi.in`,
  NEXT_PUBLIC_META_APP_ID: env.META_APP_ID || env.NEXT_PUBLIC_META_APP_ID,
  NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID:
    env.META_EMBEDDED_SIGNUP_CONFIG_ID || env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID,
  NEXT_PUBLIC_GROWVISI_SALES_WHATSAPP: env.NEXT_PUBLIC_GROWVISI_SALES_WHATSAPP || "8660838896",
  NEXT_PUBLIC_SENTRY_DSN: env.NEXT_PUBLIC_SENTRY_DSN || env.SENTRY_DSN,
};

for (const [key, value] of Object.entries(WEB_VARS)) {
  setEnv(webDir, key, value);
}

console.log("\n═══ Done ═══");

const INFRA_FROM_LOCAL = [
  "REDIS_URL",
  "CRON_SECRET",
  "JWT_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "OPENAI_API_KEY",
  "QSTASH_TOKEN",
  "QSTASH_CURRENT_SIGNING_KEY",
  "QSTASH_NEXT_SIGNING_KEY",
];
const missingLocal = INFRA_FROM_LOCAL.filter((k) => !String(env[k] ?? "").trim());
console.log("\n═══ Production infra ═══");
console.log(`  COOKIE_DOMAIN → always set to ${DOMAIN.COOKIE} on API`);
if (missingLocal.length > 0) {
  console.warn(
    `  ⚠ Not in local .env (skipped or empty on Vercel): ${missingLocal.join(", ")}`,
  );
  console.warn(
    "    API production deploy will FAIL to start without REDIS_URL, CRON_SECRET, COOKIE_DOMAIN.",
  );
  console.warn("    Generate CRON_SECRET: openssl rand -base64 32");
} else {
  console.log("  ✓ REDIS_URL, CRON_SECRET, JWT_SECRET present in local .env");
}

console.log("\nVerify after deploy:");
console.log(`  curl -s ${DOMAIN.API}/api/v1/health | jq .checks`);

console.log("\nRedeploy for changes to take effect:");
console.log("  cd apps/api && vercel deploy --prod");
console.log("  cd apps/web && vercel deploy --prod");
console.log("\nOptional — add to .env then re-run this script:");
console.log("  SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN (from sentry.io project)");
console.log("  RAZORPAY_* (from Razorpay Dashboard)");
