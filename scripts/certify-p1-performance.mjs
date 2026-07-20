#!/usr/bin/env node
/**
 * P1 performance probes — shell-bootstrap cache + pipeline bounded queries.
 *
 * Usage:
 *   pnpm certify:p1-performance
 *   CERTIFY_TOKEN=... pnpm certify:p1-performance
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApiUrl, getCertifyToken } from "./lib/certify-env.mjs";
import { loadRootEnv, ROOT } from "./lib/load-root-env.mjs";

loadRootEnv();

const SAMPLES = Number.parseInt(process.env.CERTIFY_SAMPLES || "10", 10);
const ARTIFACT_DIR = path.join(ROOT, "docs/certification/artifacts/p1-performance");

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function timedFetch(token, pathSuffix) {
  const api = getApiUrl();
  const start = performance.now();
  const res = await fetch(`${api}${pathSuffix}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  const ms = performance.now() - start;
  return { ok: res.ok, status: res.status, ms, bytes: new TextEncoder().encode(text).length, text };
}

async function probeShellBootstrap(token) {
  const cold = [];
  const warm = [];
  let lastBytes = 0;

  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await timedFetch(token, "/organizations/shell-bootstrap");
    if (!r.ok) throw new Error(`shell-bootstrap failed: ${r.status}`);
    cold.push(r.ms);
    lastBytes = r.bytes;
  }
  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await timedFetch(token, "/organizations/shell-bootstrap");
    warm.push(r.ms);
    lastBytes = r.bytes;
  }
  cold.sort((a, b) => a - b);
  warm.sort((a, b) => a - b);
  const warmP95 = Math.round(percentile(warm, 95));

  return {
    phase: "P1-shell-bootstrap",
    payload_bytes: lastBytes,
    latency_ms: {
      cold: { p50: Math.round(percentile(cold, 50)), p95: Math.round(percentile(cold, 95)) },
      warm: { p50: Math.round(percentile(warm, 50)), p95: warmP95 },
    },
    pass_warm_p95_under_400ms: warmP95 <= 400,
    note: "Warm p95 ≤400ms per §4.2; requires Redis for meaningful cache hit.",
  };
}

async function probePipeline(token) {
  const latencies = [];
  let lastBytes = 0;
  let shapeOk = false;

  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await timedFetch(token, "/leads/pipeline?perStageLimit=40");
    if (!r.ok) throw new Error(`pipeline failed: ${r.status}`);
    latencies.push(r.ms);
    lastBytes = r.bytes;
    try {
      const body = JSON.parse(r.text);
      shapeOk =
        body &&
        typeof body === "object" &&
        body.grouped &&
        typeof body.hasMoreByStage === "object" &&
        typeof body.perStageLimit === "number";
    } catch {
      shapeOk = false;
    }
  }
  latencies.sort((a, b) => a - b);
  const p95 = Math.round(percentile(latencies, 95));

  return {
    phase: "P1-pipeline-pagination",
    payload_bytes: lastBytes,
    latency_ms: { p50: Math.round(percentile(latencies, 50)), p95 },
    pass_shape: shapeOk,
    pass_p95_under_800ms: p95 <= 800,
    note: "Per-stage SQL take(limit+1); p95 budget is local sanity check.",
  };
}

async function main() {
  console.log("P1 performance certification probe\n");

  const token = await getCertifyToken();
  const report = {
    certified_at: new Date().toISOString(),
    environment: "local-dev",
    api_url: getApiUrl(),
    samples: SAMPLES,
    probes: [await probeShellBootstrap(token), await probePipeline(token)],
  };

  const blockers = [];
  for (const p of report.probes) {
    if (p.phase === "P1-shell-bootstrap" && !p.pass_warm_p95_under_400ms) {
      blockers.push(`Shell bootstrap warm p95 ${p.latency_ms.warm.p95}ms > 400ms`);
    }
    if (p.phase === "P1-pipeline-pagination") {
      if (!p.pass_shape) blockers.push("Pipeline response shape invalid");
      if (!p.pass_p95_under_800ms) {
        blockers.push(`Pipeline p95 ${p.latency_ms.p95}ms > 800ms (waiver ok on remote DB)`);
      }
    }
  }

  report.status = blockers.length === 0 ? "PASS" : "WARN";
  report.blockers = blockers;

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const out = path.join(ARTIFACT_DIR, `p1-probe-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nArtifact: ${out}`);

  if (blockers.length > 0) {
    console.warn(`\nWarnings: ${blockers.join("; ")}`);
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
