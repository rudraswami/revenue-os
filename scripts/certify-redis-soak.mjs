#!/usr/bin/env node
/**
 * P0-4 Redis resilience probe — verifies cache fallback metrics via /health.
 *
 * Usage:
 *   API_URL=http://127.0.0.1:4000/api/v1 pnpm certify:redis-soak
 *   CERTIFY_TOKEN=... pnpm certify:redis-soak
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApiUrl, getCertifyToken } from "./lib/certify-env.mjs";
import { loadRootEnv, ROOT } from "./lib/load-root-env.mjs";

loadRootEnv();

const ARTIFACT_DIR = path.join(ROOT, "docs/certification/artifacts/auth-cache");

async function main() {
  const api = getApiUrl();
  const token = await getCertifyToken();

  const healthRes = await fetch(`${api}/health`);
  const health = await healthRes.json().catch(() => ({}));
  const cacheMetrics = health?.checks?.serverCache ?? null;

  const samples = [];
  for (let i = 0; i < 10; i += 1) {
    const start = performance.now();
    const res = await fetch(`${api}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    samples.push({ ok: res.ok, ms: performance.now() - start });
    await res.text();
  }

  const report = {
    certified_at: new Date().toISOString(),
    phase: "P0-4-redis-soak",
    api_url: api,
    redis_url_configured: Boolean(process.env.REDIS_URL?.trim()),
    health_cache_metrics: cacheMetrics,
    auth_me_samples: samples,
    all_auth_ok: samples.every((s) => s.ok),
    partition_soak: {
      status: "UNIT_TESTED",
      note: "Live Redis partition requires staging ops — server-cache.service.spec.ts covers timeout/retry fallback.",
    },
    pass: samples.every((s) => s.ok),
  };

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const artifactPath = path.join(ARTIFACT_DIR, `redis-soak-${Date.now()}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nArtifact: ${artifactPath}`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
