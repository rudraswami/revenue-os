#!/usr/bin/env node
/** Push Supabase connection vars from .env to Vercel API production. */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { toPoolerDatabaseUrl } = require("./supabase-pooler-url");

const apiDir = path.join(__dirname, "..", "apps", "api");
const envPath = path.join(__dirname, "..", ".env");

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    map.set(t.slice(0, eq).trim(), t.slice(eq + 1).trim());
  }
  return map;
}

function setEnv(name, value) {
  if (!value) {
    console.warn(`  skip ${name} (empty)`);
    return;
  }
  try {
    execSync(`vercel env rm ${name} production --yes`, {
      cwd: apiDir,
      stdio: "pipe",
    });
  } catch {
    /* not set yet */
  }
  execSync(`vercel env add ${name} production`, {
    cwd: apiDir,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log(`  ✓ ${name}`);
}

if (!fs.existsSync(envPath)) {
  console.error("Missing .env — run pnpm db:merge-supabase-env first");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));

const databaseUrl = toPoolerDatabaseUrl({
  databaseUrl: env.get("DATABASE_URL"),
  directUrl: env.get("DIRECT_URL"),
  projectId: env.get("SUPABASE_PROJECT_ID"),
  region: env.get("SUPABASE_DB_REGION"),
  poolerHost: env.get("SUPABASE_POOLER_HOST"),
});

const keys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "EMAIL_VERIFICATION_REQUIRED",
];

console.log("Updating Vercel API production Supabase vars…");
for (const k of keys) {
  const value =
    k === "DATABASE_URL"
      ? databaseUrl
      : env.get(k) || (k === "EMAIL_VERIFICATION_REQUIRED" ? "true" : "");
  setEnv(k, value);
}
console.log("Done.");
