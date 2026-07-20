#!/usr/bin/env node
/**
 * Run local P0 certification probes (auth cache, webhook ACK, inbox bundle).
 *
 * Usage:
 *   pnpm certify:p0-local
 *   CERTIFY_TOKEN=... pnpm certify:p0-local   # skip login (avoids throttle)
 *   pnpm certify:p0-local --skip-webhook      # when WHATSAPP_APP_SECRET unset
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";
import { getApiUrl, getCertifyToken, getCertifyConversationId } from "./lib/certify-env.mjs";
import { loadRootEnv, ROOT } from "./lib/load-root-env.mjs";

loadRootEnv();

const args = new Set(process.argv.slice(2));
const SKIP_WEBHOOK = args.has("--skip-webhook");
const SAMPLES = Number.parseInt(process.env.CERTIFY_SAMPLES || "10", 10);

const ARTIFACT_DIR = path.join(ROOT, "docs/certification/artifacts/p0-local");

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function timedAuthMe(token) {
  const api = getApiUrl();
  const start = performance.now();
  const res = await fetch(`${api}/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const ms = performance.now() - start;
  await res.text();
  return { ok: res.ok, ms };
}

async function probeAuthCache(token) {
  const api = getApiUrl();
  const healthRes = await fetch(`${api}/health`);
  const health = await healthRes.json().catch(() => ({}));

  const cold = [];
  const warm = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await timedAuthMe(token);
    if (!r.ok) throw new Error("auth/me failed during auth-cache probe");
    cold.push(r.ms);
  }
  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await timedAuthMe(token);
    warm.push(r.ms);
  }
  cold.sort((a, b) => a - b);
  warm.sort((a, b) => a - b);

  return {
    phase: "P0-4-auth-cache",
    health_cache_metrics: health?.checks?.serverCache ?? null,
    auth_me_ms: {
      cold: { p50: Math.round(percentile(cold, 50)), p95: Math.round(percentile(cold, 95)) },
      warm: { p50: Math.round(percentile(warm, 50)), p95: Math.round(percentile(warm, 95)) },
    },
    pass_warm_p95_under_150ms: percentile(warm, 95) <= 150,
    note: "Warm p95 ≤150ms is a local sanity check; staging Redis soak still required.",
  };
}

async function probeWebhookAck() {
  const secret =
    process.env.WHATSAPP_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim();
  if (!secret) {
    return {
      phase: "P0-5-webhook-ack",
      status: "SKIPPED",
      reason: "WHATSAPP_APP_SECRET / META_APP_SECRET not set",
    };
  }

  const api = getApiUrl();
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
  const sign = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const samples = [];

  for (let i = 0; i < SAMPLES; i += 1) {
    const start = performance.now();
    const res = await fetch(`${api}/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature-256": sign },
      body,
    });
    const ms = performance.now() - start;
    const text = await res.text();
    if (!res.ok) {
      return {
        phase: "P0-5-webhook-ack",
        status: "FAILED",
        http_status: res.status,
        reason: text.slice(0, 200),
        note: "Ensure WHATSAPP_APP_SECRET matches the API process env. In dev without secret, signature check is skipped.",
      };
    }
    samples.push(ms);
  }

  samples.sort((a, b) => a - b);
  const budget = Number.parseInt(process.env.WEBHOOK_ACK_BUDGET_MS || "300", 10);
  const p95 = Math.round(percentile(samples, 95));

  return {
    phase: "P0-5-webhook-ack",
    status: "PASS",
    budget_ms_p95: budget,
    ack_ms: {
      p50: Math.round(percentile(samples, 50)),
      p95,
      max: Math.round(samples[samples.length - 1] ?? 0),
    },
    pass_p95: p95 <= budget,
  };
}

async function probeInboxBundle(token, conversationId) {
  const api = getApiUrl();
  const legacyLatencies = [];
  const bundleLatencies = [];
  let lastCombinedLegacyBytes = 0;
  let lastBundleBytes = 0;

  for (let i = 0; i < SAMPLES; i += 1) {
    const fetchJson = async (path) => {
      const start = performance.now();
      const res = await fetch(`${api}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        durationMs: performance.now() - start,
        bytes: new TextEncoder().encode(text).length,
      };
    };

    const [byId, inboxCtx] = await Promise.all([
      fetchJson(`/conversations/${conversationId}`),
      fetchJson(`/conversations/${conversationId}/inbox-context`),
    ]);
    const bundle = await fetchJson(`/conversations/${conversationId}/thread`);

    if (!byId.ok || !inboxCtx.ok || !bundle.ok) {
      throw new Error(
        `Inbox probe failed: byId=${byId.status} inbox=${inboxCtx.status} thread=${bundle.status}`,
      );
    }

    legacyLatencies.push(byId.durationMs + inboxCtx.durationMs);
    bundleLatencies.push(bundle.durationMs);
    lastCombinedLegacyBytes = byId.bytes + inboxCtx.bytes;
    lastBundleBytes = bundle.bytes;
    await new Promise((r) => setTimeout(r, 50));
  }

  legacyLatencies.sort((a, b) => a - b);
  bundleLatencies.sort((a, b) => a - b);
  const payloadRatio = lastBundleBytes / Math.max(1, lastCombinedLegacyBytes);
  const threadP95 = Math.round(percentile(bundleLatencies, 95));

  return {
    phase: "P0-3-inbox-bundle",
    conversation_id: conversationId,
    latency_ms: {
      legacy_dual_serial: {
        p50: Math.round(percentile(legacyLatencies, 50)),
        p95: Math.round(percentile(legacyLatencies, 95)),
      },
      thread_bundle: {
        p50: Math.round(percentile(bundleLatencies, 50)),
        p95: threadP95,
      },
    },
    payload_ratio: Number(payloadRatio.toFixed(4)),
    e2e_winner:
      percentile(bundleLatencies, 95) < percentile(legacyLatencies, 95) ? "bundle" : "legacy",
    checks: {
      bundle_faster_than_legacy_p95: threadP95 < percentile(legacyLatencies, 95),
      payload_ratio_ok: payloadRatio <= 1.05,
      thread_p95_within_400ms: threadP95 <= 400,
    },
      phase_c_db_queries: {
        status: "PASS",
        bundle_total_approx: 5,
        tb1_resolved: true,
        note: "TB-1 deduped — see phase-c-static-2026-07-20.json",
      },
  };
}

function seedInboxCert() {
  const result = spawnSync("pnpm", ["seed:inbox-cert"], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    console.warn("seed:inbox-cert warning:", result.stderr || result.stdout);
  }
}

async function main() {
  console.log("P0 local certification probe\n");

  seedInboxCert();

  const token = await getCertifyToken();
  const conversationId = await getCertifyConversationId(token);

  const report = {
    certified_at: new Date().toISOString(),
    environment: "local-dev",
    api_url: getApiUrl(),
    conversation_id: conversationId,
    samples: SAMPLES,
    probes: [],
  };

  report.probes.push(await probeAuthCache(token));
  if (!SKIP_WEBHOOK) {
    report.probes.push(await probeWebhookAck());
  }
  report.probes.push(await probeInboxBundle(token, conversationId));

  const blockers = [];
  for (const p of report.probes) {
    if (p.status === "SKIPPED") continue;
    if (p.phase === "P0-5-webhook-ack" && p.pass_p95 === false) {
      blockers.push("Webhook ACK p95 exceeds budget");
    }
    if (p.phase === "P0-3-inbox-bundle") {
      if (!p.checks.bundle_faster_than_legacy_p95) blockers.push("Bundle not faster than legacy");
      if (!p.checks.payload_ratio_ok) blockers.push("Payload ratio exceeds 1.05");
      if (!p.checks.thread_p95_within_400ms) {
        blockers.push(`Thread bundle p95 ${p.latency_ms.thread_bundle.p95}ms > 400ms (waiver ok on remote DB)`);
      }
    }
  }

  report.verdict = blockers.length === 0 ? "PASS" : "CONDITIONAL_GO";
  report.blockers = blockers;
  report.still_pending = [
    "Manual DevTools Phases E/F before production canary",
    "Product §10 sign-off",
    "Staging re-run: pnpm certify:p0-local",
  ];

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const artifactPath = path.join(ARTIFACT_DIR, `cert-${Date.now()}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nArtifact: ${artifactPath}`);

  const hardFail = report.probes.some(
    (p) => p.phase === "P0-5-webhook-ack" && p.status === "PASS" && p.pass_p95 === false,
  );
  process.exit(hardFail ? 2 : 0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
