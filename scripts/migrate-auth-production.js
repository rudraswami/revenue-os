/**
 * Apply auth production SQL migration (password reset table + clear stale refresh tokens).
 * Usage: node scripts/migrate-auth-production.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DIRECT_URL or DATABASE_URL in .env");
  process.exit(1);
}

const sqlPath = path.join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260601000000_auth_production.sql",
);

(async () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Auth migration applied.");
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e.message);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
})();
