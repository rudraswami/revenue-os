/**
 * Apply performance index migration (handoff metadata GIN + contact search).
 * Usage: dotenv -e .env -- node scripts/migrate-performance-indexes.js
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
  "20260719160000_performance_indexes.sql",
);

(async () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log("Performance indexes migration applied.");
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
