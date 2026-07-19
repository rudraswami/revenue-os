#!/usr/bin/env node
/**
 * Production smoke tests — run after deploy or env sync.
 *
 * Usage:
 *   node scripts/smoke-production.mjs
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke-production.mjs
 */
const API = process.env.SMOKE_API_URL ?? "https://api.growvisi.in/api/v1";
const WEB = process.env.SMOKE_WEB_URL ?? "https://www.growvisi.in";

async function get(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function getWeb(path) {
  const res = await fetch(`${WEB}${path}`);
  return { status: res.status, ok: res.ok };
}

function pass(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  process.exitCode = 1;
}

console.log("Growvisi production smoke tests\n");

// API health
const health = await get("/health");
if (health.status === 200 && health.json?.status) {
  pass(`API health (${health.json.status})`);
  if (health.json.checks) {
    console.log(`    database=${health.json.checks.database} redis=${health.json.checks.redis} workers=${health.json.checks.workers}`);
  }
} else {
  fail("API health", `status ${health.status}`);
}

// Web home
const home = await getWeb("/");
if (home.ok) pass("Web homepage");
else fail("Web homepage", `status ${home.status}`);

// Web login page
const login = await getWeb("/login");
if (login.ok) pass("Web login page");
else fail("Web login page", `status ${login.status}`);

// Authenticated API (optional)
const email = process.env.SMOKE_EMAIL?.trim();
const password = process.env.SMOKE_PASSWORD?.trim();
if (email && password) {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    fail("Auth login", `status ${loginRes.status}`);
  } else {
    const body = await loginRes.json();
    const token = body.accessToken;
    pass("Auth login");

    const headers = { Authorization: `Bearer ${token}` };
    const readiness = await get("/whatsapp-accounts/connection-health", { headers });
    if (readiness.status === 200) pass("Connection health API");
    else fail("Connection health API", `status ${readiness.status}`);

    const onboarding = await get("/organizations/onboarding-progress", { headers });
    if (onboarding.status === 200) {
      pass("Onboarding progress API");
      const aiCheck = onboarding.json?.platformHealth?.openAiConfigured;
      if (aiCheck === false) {
        console.warn("    ⚠ platformHealth.openAiConfigured=false — check OPENAI_API_KEY on Vercel");
      }
    } else {
      fail("Onboarding progress API", `status ${onboarding.status}`);
    }
  }
} else {
  console.log("  ○ Skipping authenticated checks (set SMOKE_EMAIL + SMOKE_PASSWORD)");
}

console.log(process.exitCode ? "\nSmoke tests FAILED" : "\nSmoke tests passed");
