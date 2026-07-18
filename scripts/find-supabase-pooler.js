#!/usr/bin/env node
/** Find the correct Supabase pooler host for a project ref. */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const { toPoolerDatabaseUrl } = require("./supabase-pooler-url");

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

const envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env");
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const projectId = env.get("SUPABASE_PROJECT_ID");
const directUrl = env.get("DIRECT_URL");
const passwordMatch = directUrl?.match(/postgresql:\/\/postgres:([^@]+)@/);
const password = passwordMatch?.[1];
if (!projectId || !password) {
  console.error("Need SUPABASE_PROJECT_ID and DIRECT_URL in .env");
  process.exit(1);
}

const regions = [
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "eu-west-1",
  "eu-central-1",
  "us-east-1",
  "us-west-1",
];

const prefixes = ["aws-0", "aws-1"];

async function tryHost(host) {
  const url = `postgresql://postgres.${projectId}:${password}@${host}:6543/postgres?pgbouncer=true`;
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      /* */
    }
    return false;
  }
}

(async () => {
  for (const prefix of prefixes) {
    for (const region of regions) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      process.stdout.write(`try ${host} ... `);
      const ok = await tryHost(host);
      if (ok) {
        console.log("OK");
        const poolerUrl = toPoolerDatabaseUrl({
          databaseUrl: directUrl,
          directUrl,
          projectId,
          poolerHost: host,
        });
        console.log(`\nSUPABASE_POOLER_HOST=${host}`);
        console.log(`DATABASE_URL=${poolerUrl}`);
        process.exit(0);
      }
      console.log("no");
    }
  }
  console.error("\nNo pooler host matched. Copy Transaction pooler URL from Supabase Dashboard.");
  process.exit(1);
})();
