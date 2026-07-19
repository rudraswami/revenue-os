/**
 * Apply intelligence settings backfill + starter Business Knowledge migration.
 * Optionally indexes pending migration_starter docs when OPENAI_API_KEY is set.
 *
 * Usage:
 *   node scripts/migrate-intelligence-backfill.js --embed
 * Loads: .env, .env.supabase, .env.supabase.new, supabase.env (later overrides earlier)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { Client } = require("pg");

const root = path.join(__dirname, "..");
const ENV_FILES = [".env", ".env.supabase", ".env.supabase.new", "supabase.env"];

function loadEnvFiles() {
  for (const name of ENV_FILES) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.replace(/\r$/, "").trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      let key = trimmed.slice(0, eq).trim();
      if (key.startsWith("export ")) key = key.slice(7).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (["DIRECT_URL", "DATABASE_URL", "OPENAI_API_KEY"].includes(key) && val) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFiles();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DIRECT_URL or DATABASE_URL in supabase.env or .env.supabase.new");
  process.exit(1);
}

const sqlPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260719130000_intelligence_settings_kb_starter.sql",
);

const embedAfter = process.argv.includes("--embed");

(async () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log("Applying intelligence settings + KB starter migration…");
    await client.query(sql);

    const presetBackfill = await client.query(`
      SELECT count(*)::int AS n
      FROM organizations
      WHERE settings->'intelligence'->>'automationPreset' IS NOT NULL
    `);
    const pendingKb = await client.query(`
      SELECT count(*)::int AS n
      FROM knowledge_documents
      WHERE "sourceType" = 'migration_starter' AND status = 'pending'
    `);
    console.log(
      `Done. Orgs with automationPreset: ${presetBackfill.rows[0].n}. Pending starter KB docs: ${pendingKb.rows[0].n}.`,
    );

    await client.end();
  } catch (e) {
    console.error("Migration failed:", e.message);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }

  if (embedAfter) {
    console.log("Indexing pending migration_starter knowledge documents…");
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, "..", "apps", "api", "node_modules", "tsx", "dist", "cli.mjs"), path.join(__dirname, "..", "apps", "api", "scripts", "migrate-intelligence-kb-embed.ts")],
      { stdio: "inherit", env: process.env, cwd: path.join(__dirname, "..", "apps", "api") },
    );
    process.exit(result.status ?? 1);
  }

  if (process.env.OPENAI_API_KEY) {
    console.log("Tip: run with --embed to index starter Business Knowledge (OPENAI_API_KEY is set).");
  } else {
    console.log("Tip: set OPENAI_API_KEY and run with --embed to index starter Business Knowledge.");
  }
})();
