/**
 * Merge new Supabase connection vars into a working root .env for local bootstrap.
 *
 * 1. Fill .env.supabase.new with your new project URLs/keys
 * 2. pnpm vercel env pull is optional (uses .env.vercel.api.tmp if present)
 * 3. Run: pnpm db:merge-supabase-env
 */
const fs = require("fs");
const path = require("path");
const { toPoolerDatabaseUrl } = require("./supabase-pooler-url");

const root = path.join(__dirname, "..");
const supabaseFile = path.join(root, ".env.supabase.new");
const vercelFile = path.join(root, ".env.vercel.api.tmp");
const outFile = path.join(root, ".env");

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function serializeEnv(map, header) {
  const lines = [header, ""];
  for (const [k, v] of map) {
    if (!v) continue;
    const needsQuote = /[\s#]/.test(v);
    lines.push(needsQuote ? `${k}="${v}"` : `${k}=${v}`);
  }
  lines.push("");
  return lines.join("\n");
}

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
];

if (!fs.existsSync(supabaseFile)) {
  console.error("Missing .env.supabase.new — copy from template and fill Supabase values.");
  process.exit(1);
}

const supabase = parseEnv(fs.readFileSync(supabaseFile, "utf8"));
const missing = required.filter((k) => !supabase.get(k)?.trim());
if (missing.length) {
  console.error("Fill these in .env.supabase.new:", missing.join(", "));
  process.exit(1);
}

const merged = new Map();

if (fs.existsSync(vercelFile)) {
  const vercel = parseEnv(fs.readFileSync(vercelFile, "utf8"));
  for (const [k, v] of vercel) {
    if (k.startsWith("VERCEL_") || k === "NX_DAEMON" || k === "TURBO_") continue;
    merged.set(k, v);
  }
  console.log("Merged production vars from .env.vercel.api.tmp");
} else {
  console.log("No .env.vercel.api.tmp — only Supabase vars written. Run:");
  console.log("  cd apps/api && vercel env pull ../../.env.vercel.api.tmp --environment=production");
}

for (const [k, v] of supabase) {
  if (v?.trim()) merged.set(k, v.trim());
}

const poolerUrl = toPoolerDatabaseUrl({
  databaseUrl: merged.get("DATABASE_URL"),
  directUrl: merged.get("DIRECT_URL"),
  projectId: merged.get("SUPABASE_PROJECT_ID"),
  region: merged.get("SUPABASE_DB_REGION"),
  poolerHost: merged.get("SUPABASE_POOLER_HOST"),
});
if (poolerUrl) merged.set("DATABASE_URL", poolerUrl);

merged.set("NODE_ENV", merged.get("NODE_ENV") || "development");
merged.set("API_PORT", merged.get("API_PORT") || "4000");
merged.set("API_URL", merged.get("API_URL") || "http://localhost:4000");
merged.set(
  "NEXT_PUBLIC_API_URL",
  merged.get("NEXT_PUBLIC_API_URL") || "http://localhost:4000/api/v1",
);
merged.set("NEXT_PUBLIC_APP_URL", merged.get("NEXT_PUBLIC_APP_URL") || "http://localhost:3000");
merged.set("EMAIL_VERIFICATION_REQUIRED", merged.get("EMAIL_VERIFICATION_REQUIRED") || "true");

const header = `# Growvisi .env — generated ${new Date().toISOString()}
# Supabase: new project | API secrets: from Vercel production pull`;

fs.writeFileSync(outFile, serializeEnv(merged, header));
console.log(`Wrote ${outFile} (${merged.size} variables)`);
console.log("Next: pnpm db:setup-fresh -- --seed");
