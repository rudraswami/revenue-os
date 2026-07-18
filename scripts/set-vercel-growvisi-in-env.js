#!/usr/bin/env node
/** Set Growvisi .in domain env vars on Vercel (no trailing CRLF). */
const { execSync } = require("child_process");
const path = require("path");

function run(cmd, input) {
  execSync(cmd, {
    stdio: input !== undefined ? ["pipe", "inherit", "inherit"] : "inherit",
    input,
    shell: true,
  });
}

function setEnv(cwd, name, value, environment = "production") {
  process.chdir(cwd);
  try {
    run(`vercel env rm ${name} ${environment} --yes`);
  } catch {
    /* may not exist */
  }
  run(`vercel env add ${name} ${environment}`, value);
  console.log(`  ✓ ${path.basename(cwd)} ${environment} ${name}=${value}`);
}

const root = path.join(__dirname, "..");
const webDir = path.join(root, "apps", "web");
const apiDir = path.join(root, "apps", "api");

console.log("Updating Vercel web (revenue-os-web)…");
setEnv(webDir, "NEXT_PUBLIC_APP_URL", "https://www.growvisi.in");
setEnv(webDir, "NEXT_PUBLIC_API_URL", "https://api.growvisi.in/api/v1");
setEnv(webDir, "NEXT_PUBLIC_WS_URL", "wss://api.growvisi.in");
setEnv(webDir, "NEXT_PUBLIC_GROWVISI_SALES_WHATSAPP", "8660838896");

console.log("Updating Vercel API (revenue-os-api)…");
setEnv(apiDir, "NEXT_PUBLIC_APP_URL", "https://www.growvisi.in");
setEnv(apiDir, "CORS_ORIGINS", "https://growvisi.in,https://www.growvisi.in");
setEnv(apiDir, "WEBHOOK_PUBLIC_URL", "https://api.growvisi.in");
setEnv(apiDir, "EMAIL_VERIFICATION_REQUIRED", "true");

console.log("Done. Redeploy web + API for changes to take effect.");
