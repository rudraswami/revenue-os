const { Client } = require("pg");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DIRECT_URL or DATABASE_URL in .env");
  process.exit(1);
}

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const r = await c.query("SELECT 1 as ok");
    console.log("OK:", url.replace(/:[^:@]+@/, ":***@"), r.rows);
    await c.end();
    process.exit(0);
  } catch (e) {
    console.error("FAIL:", url.replace(/:[^:@]+@/, ":***@"), e.message);
    try {
      await c.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
})();
