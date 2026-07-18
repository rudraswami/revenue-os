/**
 * Bootstrap a brand-new Supabase Postgres with the full Growvisi schema.
 *
 * Usage (from repo root, after .env has DIRECT_URL + DATABASE_URL):
 *   pnpm db:setup-fresh
 *   pnpm db:setup-fresh -- --seed
 *
 * Do NOT run old supabase/migrations/*.sql on an empty DB — they assume prior
 * state. Prisma schema is the single source of truth for a fresh install.
 */
const { execSync } = require("child_process");
const path = require("path");
const { Client } = require("pg");

const TABLES = [
  "users",
  "refresh_tokens",
  "password_reset_tokens",
  "email_verification_tokens",
  "organizations",
  "agency_clients",
  "organization_members",
  "organization_invites",
  "workspaces",
  "api_keys",
  "whatsapp_accounts",
  "conversations",
  "messages",
  "leads",
  "lead_stage_history",
  "pipeline_stages",
  "ai_runs",
  "conversation_memories",
  "knowledge_documents",
  "knowledge_chunks",
  "automations",
  "automation_logs",
  "subscriptions",
  "usage_meters",
  "audit_logs",
  "notifications",
  "webhook_events",
  "tags",
  "lead_tags",
  "lead_notes",
  "tasks",
  "campaigns",
  "campaign_recipients",
  "tracking_links",
];

const EXTENSIONS_SQL = `
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
`;

async function main() {
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) {
    console.error("Set DIRECT_URL and DATABASE_URL in .env first.");
    console.error("Supabase → Project Settings → Database → Connection string");
    process.exit(1);
  }

  const withSeed = process.argv.includes("--seed");
  const root = path.join(__dirname, "..");

  console.log("1/4 Enabling pgvector extension…");
  const client = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(EXTENSIONS_SQL);
  await client.end();

  console.log("2/4 Pushing full Prisma schema (all tables)…");
  execSync("pnpm --filter @growvisi/database push", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  console.log("3/4 Verifying tables…");
  const verify = new Client({ connectionString: directUrl, ssl: { rejectUnauthorized: false } });
  await verify.connect();

  const missing = [];
  for (const table of TABLES) {
    const res = await verify.query("SELECT to_regclass($1) AS t", [`public.${table}`]);
    if (!res.rows[0]?.t) missing.push(table);
  }

  const ext = await verify.query(
    "SELECT extname FROM pg_extension WHERE extname = 'vector'",
  );
  const emailCol = await verify.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'emailVerified'`,
  );

  await verify.end();

  if (missing.length > 0) {
    console.error("Missing tables:", missing.join(", "));
    process.exit(1);
  }
  if (ext.rows.length === 0) {
    console.error("vector extension not installed.");
    process.exit(1);
  }
  if (emailCol.rows.length === 0) {
    console.error("users.emailVerified column missing.");
    process.exit(1);
  }

  console.log(`   ✓ ${TABLES.length} tables present`);
  console.log("   ✓ pgvector extension");
  console.log("   ✓ email_verification_tokens");
  console.log("   ✓ users.emailVerified");

  if (withSeed) {
    console.log("4/4 Seeding demo accounts…");
    execSync("pnpm --filter @growvisi/database seed", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
  } else {
    console.log("4/4 Skipping seed (pass --seed to create demo@growvisi.com + meta reviewer)");
  }

  console.log("\nFresh Supabase database is ready.");
  console.log("Next: update Vercel API env DATABASE_URL + DIRECT_URL, then redeploy API.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
