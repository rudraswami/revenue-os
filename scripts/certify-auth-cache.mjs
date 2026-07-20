#!/usr/bin/env node
/**
 * P0-4 auth cache probe — measures JWT validation path with/without warm cache.
 *
 * Usage:
 *   API_URL=http://127.0.0.1:4000/api/v1 CERTIFY_TOKEN=... pnpm certify:auth-cache
 */
import { getApiUrl, getCertifyToken } from "./lib/certify-env.mjs";
import { loadRootEnv } from "./lib/load-root-env.mjs";

loadRootEnv();

const API_URL = getApiUrl();

const SAMPLES = Number.parseInt(process.env.CERTIFY_SAMPLES || "20", 10);

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function timedFetch(path) {
  const start = performance.now();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  const ms = performance.now() - start;
  await res.text();
  return { ok: res.ok, ms };
}

async function main() {
  const TOKEN = process.env.CERTIFY_TOKEN || (await getCertifyToken());
  if (!API_URL || !TOKEN) {
    console.error("Set API_URL and CERTIFY_TOKEN");
    process.exit(1);
  }

  const healthRes = await fetch(`${API_URL}/health`);
  const health = await healthRes.json();

  const cold = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await timedFetch("/auth/me");
    if (!r.ok) {
      console.error("auth/me failed");
      process.exit(1);
    }
    cold.push(r.ms);
  }

  const warm = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await timedFetch("/auth/me");
    warm.push(r.ms);
  }

  cold.sort((a, b) => a - b);
  warm.sort((a, b) => a - b);

  const report = {
    certified_at: new Date().toISOString(),
    api_url: API_URL,
    samples: SAMPLES,
    health_cache_metrics: health?.checks?.serverCache ?? null,
    auth_me_ms: {
      cold: { p50: Math.round(percentile(cold, 50)), p95: Math.round(percentile(cold, 95)) },
      warm: { p50: Math.round(percentile(warm, 50)), p95: Math.round(percentile(warm, 95)) },
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
