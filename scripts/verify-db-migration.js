const { Client } = require("pg");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("No DIRECT_URL");
  process.exit(1);
}

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const cols = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='subscriptions' AND column_name LIKE '%razorpay%'`,
  );
  const invites = await c.query(`SELECT to_regclass('public.organization_invites') as t`);
  console.log("razorpay cols:", cols.rows.map((x) => x.column_name).join(", "));
  console.log("invites table:", invites.rows[0].t);
  await c.end();
})();
