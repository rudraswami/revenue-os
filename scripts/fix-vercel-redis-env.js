#!/usr/bin/env node
/** Fix REDIS_URL on Vercel if it contains redis-cli junk. Reads from local .env */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const apiDir = path.join(__dirname, "..", "apps", "api");
const envPath = path.join(__dirname, "..", ".env");

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map.set(t.slice(0, eq).trim(), val);
  }
  return map;
}

function normalizeRedisUrl(raw) {
  if (!raw) return "";
  let v = raw.trim();
  if (/^rediss?:\/\//.test(v)) return v;
  const match = v.match(/rediss?:\/\/[^\s'"]+/);
  if (match) {
    return match[0].startsWith("redis://")
      ? match[0].replace(/^redis:\/\//, "rediss://")
      : match[0];
  }
  return v;
}

let redis = normalizeRedisUrl(process.env.REDIS_URL || "");
if (!redis && fs.existsSync(envPath)) {
  redis = normalizeRedisUrl(parseEnv(fs.readFileSync(envPath, "utf8")).get("REDIS_URL"));
}
if (!redis || !/^rediss?:\/\//.test(redis)) {
  console.error("REDIS_URL missing or invalid in .env — add rediss://... from Upstash console");
  process.exit(1);
}

try {
  execSync("vercel env rm REDIS_URL production --yes", { cwd: apiDir, stdio: "pipe" });
} catch {
  /* */
}
execSync("vercel env add REDIS_URL production", {
  cwd: apiDir,
  input: redis,
  stdio: ["pipe", "inherit", "inherit"],
});
console.log("✓ REDIS_URL fixed on Vercel production");
