/**
 * Apply Razorpay + organization_invites SQL migration to production Postgres.
 * Usage: pnpm db:razorpay-migrate
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
  "20260613000000_razorpay_and_invites.sql",
);

(async () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();

    const col = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'subscriptions' AND column_name IN ('stripeCustomerId', 'razorpayCustomerId')
    `);
    const names = col.rows.map((r) => r.column_name);

    let migrationSql = sql;
    if (names.includes("razorpayCustomerId")) {
      console.log("Razorpay columns already present — applying invites-only statements.");
      migrationSql = sql
        .split("\n")
        .filter((line) => !line.includes("RENAME COLUMN") && !line.includes("razorpayPlanId"))
        .join("\n");
    } else if (!names.includes("stripeCustomerId")) {
      console.log("Stripe columns missing — adding Razorpay columns fresh.");
      migrationSql = `
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpayCustomerId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpaySubscriptionId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "razorpayPlanId" TEXT;
${migrationSql.split("\n").slice(6).join("\n")}`;
    }

    await client.query("BEGIN");
    await client.query(migrationSql);
    await client.query("COMMIT");
    console.log("Razorpay + invites migration applied.");
    await client.end();
    process.exit(0);
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("Migration failed:", e.message);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
})();
