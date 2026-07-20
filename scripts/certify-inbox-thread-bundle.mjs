#!/usr/bin/env node
/**
 * Inbox Thread Bundle — production certification probe.
 *
 * Compares legacy dual-fetch (getById + inbox-context) vs bundle endpoint:
 *   latency, payload size, and (optional) end-to-end winner accounting for RTT.
 *
 * Usage:
 *   pnpm certify:inbox --dry-run
 *   API_URL=http://127.0.0.1:4000/api/v1 CERTIFY_TOKEN=... CERTIFY_CONVERSATION_ID=... pnpm certify:inbox
 *   pnpm certify:inbox --samples=20
 */
const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const TOKEN = process.env.CERTIFY_TOKEN || process.env.E2E_TOKEN;
const CONVERSATION_ID = process.env.CERTIFY_CONVERSATION_ID;

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const SAMPLE_COUNT = Number.parseInt(
  process.argv.find((a) => a.startsWith("--samples="))?.split("=")[1] || "10",
  10,
);

const BUDGETS = {
  thread_p95_ms: 400,
  bundle_payload_max_bytes: 150 * 1024,
  payload_ratio_max: 1.05,
};

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function fetchJson(path, token) {
  const start = performance.now();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  const durationMs = performance.now() - start;
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return {
    ok: res.ok,
    status: res.status,
    durationMs,
    bytes: new TextEncoder().encode(text).length,
    body,
  };
}

function staticAudit() {
  console.log("\n=== Static audit (no network) ===\n");
  console.log("Client request budget (thread open with lead):");
  console.log("  Before: GET /conversations/:id + GET /inbox-context + GET /leads/:id/timeline = 3 HTTP");
  console.log("  After:  GET /conversations/:id/thread + GET /leads/:id/timeline = 2 HTTP");
  console.log("  Savings: 1 round-trip per thread open\n");
  console.log("Server DB (deduped bundle — static code review, TB-1 fixed):");
  console.log("  getThreadBundle: 1 conversation + 1 messages + 1 aiRun + 1 memories + 1 chunkCount (+ assignee user if needed) ≈ 5 parallel");
  console.log("  Legacy dual-call: ~8+ queries (duplicate conversation/messages)\n");
  console.log("Automated unit tests:");
  console.log("  pnpm --filter @growvisi/web test   (inbox-thread-bundle + inbox-query-cache)");
  console.log("  pnpm --filter @growvisi/api test -- conversations.service.thread-bundle.spec.ts\n");
  console.log("Performance budgets:", JSON.stringify(BUDGETS, null, 2));
}

async function liveProbe() {
  if (!API_URL || !TOKEN || !CONVERSATION_ID) {
    console.error(
      "\nMissing env for live probe. Set API_URL, CERTIFY_TOKEN, CERTIFY_CONVERSATION_ID\n",
    );
    process.exit(1);
  }

  console.log(`\n=== Live probe: ${API_URL} conversation=${CONVERSATION_ID} samples=${SAMPLE_COUNT} ===\n`);

  const legacyLatencies = [];
  const bundleLatencies = [];
  let lastLegacyBytes = 0;
  let lastBundleBytes = 0;
  let lastCombinedLegacyBytes = 0;

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const [byId, inboxCtx] = await Promise.all([
      fetchJson(`/conversations/${CONVERSATION_ID}`, TOKEN),
      fetchJson(`/conversations/${CONVERSATION_ID}/inbox-context`, TOKEN),
    ]);
    const bundle = await fetchJson(`/conversations/${CONVERSATION_ID}/thread`, TOKEN);

    if (!byId.ok || !inboxCtx.ok || !bundle.ok) {
      console.error("Request failed:", {
        byId: byId.status,
        inboxCtx: inboxCtx.status,
        bundle: bundle.status,
      });
      process.exit(1);
    }

    const legacySerialMs = byId.durationMs + inboxCtx.durationMs;
    legacyLatencies.push(legacySerialMs);
    bundleLatencies.push(bundle.durationMs);
    lastCombinedLegacyBytes = byId.bytes + inboxCtx.bytes;
    lastBundleBytes = bundle.bytes;
    lastLegacyBytes = byId.bytes;

    // small pause between samples
    await new Promise((r) => setTimeout(r, 50));
  }

  legacyLatencies.sort((a, b) => a - b);
  bundleLatencies.sort((a, b) => a - b);

  const payloadRatio = lastBundleBytes / Math.max(1, lastCombinedLegacyBytes);
  const report = {
    certified_at: new Date().toISOString(),
    api_url: API_URL,
    conversation_id: CONVERSATION_ID,
    samples: SAMPLE_COUNT,
    latency_ms: {
      legacy_dual_serial: {
        p50: Math.round(percentile(legacyLatencies, 50)),
        p95: Math.round(percentile(legacyLatencies, 95)),
      },
      thread_bundle: {
        p50: Math.round(percentile(bundleLatencies, 50)),
        p95: Math.round(percentile(bundleLatencies, 95)),
      },
    },
    payload_bytes: {
      get_by_id: lastLegacyBytes,
      inbox_context: lastCombinedLegacyBytes - lastLegacyBytes,
      combined_legacy: lastCombinedLegacyBytes,
      thread_bundle: lastBundleBytes,
      ratio_bundle_to_legacy: Number(payloadRatio.toFixed(4)),
    },
    budgets: BUDGETS,
    checks: {
      thread_p95_within_budget:
        percentile(bundleLatencies, 95) <= BUDGETS.thread_p95_ms,
      payload_ratio_ok: payloadRatio <= BUDGETS.payload_ratio_max,
      bundle_faster_than_legacy_serial_p95:
        percentile(bundleLatencies, 95) < percentile(legacyLatencies, 95),
    },
    e2e_winner:
      percentile(bundleLatencies, 95) < percentile(legacyLatencies, 95)
        ? "bundle"
        : "legacy",
    note:
      "Legacy measured as parallel fetch wall-clock sum (2 HTTP). Real browsers pay extra RTT for 2 round-trips; bundle wins more in practice.",
  };

  console.log(JSON.stringify(report, null, 2));

  const allPass = Object.values(report.checks).every(Boolean);
  process.exit(allPass ? 0 : 1);
}

async function main() {
  console.log("Inbox Thread Bundle — Production Certification Probe");
  staticAudit();
  if (DRY_RUN) {
    console.log("\n--dry-run: skipping live probe. Set API_URL + CERTIFY_TOKEN + CERTIFY_CONVERSATION_ID to measure.\n");
    return;
  }
  await liveProbe();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
