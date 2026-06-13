#!/usr/bin/env node
/** Set Growvisi domain env vars on Vercel (no trailing CRLF). */
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
    run(`npx vercel env rm ${name} ${environment} --yes`);
  } catch {
    /* may not exist */
  }
  run(`npx vercel env add ${name} ${environment}`, value);
  console.log(`  ✓ ${path.basename(cwd)} ${environment} ${name}=${value}`);
}

const root = path.join(__dirname, "..");
const webDir = path.join(root, "apps", "web");
const apiDir = path.join(root, "apps", "api");

console.log("Updating Vercel web (growvisi-web)…");
setEnv(webDir, "NEXT_PUBLIC_APP_URL", "https://www.growvisi.com");
setEnv(webDir, "NEXT_PUBLIC_API_URL", "https://api.growvisi.com/api/v1");
setEnv(webDir, "NEXT_PUBLIC_WS_URL", "wss://api.growvisi.com");

console.log("Updating Vercel API (growvisi-api)…");
setEnv(apiDir, "NEXT_PUBLIC_APP_URL", "https://www.growvisi.com");
setEnv(apiDir, "CORS_ORIGINS", "https://growvisi.com,https://www.growvisi.com");
setEnv(apiDir, "WEBHOOK_PUBLIC_URL", "https://api.growvisi.com");

for (const name of ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_WS_URL"]) {
  for (const env of ["production", "preview"]) {
    try {
      process.chdir(apiDir);
      run(`npx vercel env rm ${name} ${env} --yes`);
      console.log(`  ✓ removed API ${env} ${name}`);
    } catch {
      /* ignore */
    }
  }
}

console.log("Done. Redeploy web + API for NEXT_PUBLIC_* to take effect on web.");
