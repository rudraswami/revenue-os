#!/usr/bin/env node
/**
 * Push Razorpay env vars from root .env to Vercel API (production).
 * Requires RAZORPAY_* in .env — create plans in Razorpay Dashboard first.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v.replace(/\\r\\n/g, "").replace(/[\r\n]+/g, "").trim();
  }
  return out;
}

function run(cmd, input) {
  execSync(cmd, {
    stdio: input !== undefined ? ["pipe", "inherit", "inherit"] : "inherit",
    input,
    shell: true,
  });
}

function setEnv(cwd, name, value, environment = "production") {
  if (!value) {
    console.log(`  skip ${name} (empty)`);
    return;
  }
  process.chdir(cwd);
  try {
    run(`vercel env rm ${name} ${environment} --yes`);
  } catch {
    /* may not exist */
  }
  run(`vercel env add ${name} ${environment}`, value);
  console.log(`  ✓ ${name}`);
}

const root = path.join(__dirname, "..");
const env = loadEnv(path.join(root, ".env"));
const apiDir = path.join(root, "apps", "api");

const keys = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RAZORPAY_PLAN_STARTER",
  "RAZORPAY_PLAN_GROWTH",
  "RAZORPAY_PLAN_PRO",
];

const present = keys.filter((k) => env[k]);
if (present.length === 0) {
  console.error("No RAZORPAY_* vars in .env — add keys from Razorpay Dashboard first.");
  process.exit(1);
}

console.log(`Pushing ${present.length} Razorpay var(s) to revenue-os-api (production)…`);
for (const key of keys) {
  setEnv(apiDir, key, env[key]);
}

console.log("Done. Redeploy API: cd apps/api && vercel deploy --prod");
