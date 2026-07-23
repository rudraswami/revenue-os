#!/usr/bin/env node
/** Set auth-critical Vercel production env (cookie + JWT + CORS). Safe to re-run. */
const path = require("path");
const { execSync } = require("child_process");

const apiDir = path.join(__dirname, "..", "apps", "api");
const webDir = path.join(__dirname, "..", "apps", "web");

const DOMAIN = {
  WEB: "https://www.growvisi.in",
  API: "https://api.growvisi.in",
  CORS:
    "https://growvisi.in,https://www.growvisi.in,https://growvisi.com,https://www.growvisi.com",
  COOKIE: ".growvisi.in",
};

function setEnv(cwd, name, value) {
  execSync(`vercel env rm ${name} production --yes`, { cwd, stdio: "pipe" });
  execSync(`vercel env add ${name} production`, {
    cwd,
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log(`  ✓ ${name}`);
}

console.log("Setting Vercel API auth env (production)…");
for (const [k, v] of Object.entries({
  COOKIE_DOMAIN: DOMAIN.COOKIE,
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "7d",
  CORS_ORIGINS: DOMAIN.CORS,
  NEXT_PUBLIC_APP_URL: DOMAIN.WEB,
  NODE_ENV: "production",
})) {
  setEnv(apiDir, k, v);
}

console.log("\nSetting Vercel Web API URL (production)…");
setEnv(webDir, "NEXT_PUBLIC_API_URL", `${DOMAIN.API}/api/v1`);
setEnv(webDir, "NEXT_PUBLIC_APP_URL", DOMAIN.WEB);

console.log("\nDone. Redeploy API + Web for runtime changes.");
