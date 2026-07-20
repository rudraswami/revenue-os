#!/usr/bin/env node
/**
 * P0-5 webhook ACK probe — measures WhatsApp webhook HTTP response time.
 *
 * Usage:
 *   API_URL=http://127.0.0.1:4000/api/v1 WHATSAPP_APP_SECRET=... pnpm certify:webhook-ack
 */
import { createHmac } from "node:crypto";
import { loadRootEnv } from "./lib/load-root-env.mjs";
import { getApiUrl } from "./lib/certify-env.mjs";

loadRootEnv();

const API_URL = getApiUrl();
const SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
const SAMPLES = Number.parseInt(process.env.CERTIFY_SAMPLES || "10", 10);
const BUDGET_MS = Number.parseInt(process.env.WEBHOOK_ACK_BUDGET_MS || "300", 10);

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function sign(body) {
  const digest = createHmac("sha256", SECRET).update(body).digest("hex");
  return `sha256=${digest}`;
}

async function postWebhook() {
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [],
  });
  const start = performance.now();
  const res = await fetch(`${API_URL}/webhooks/whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hub-signature-256": sign(Buffer.from(body)),
    },
    body,
  });
  const ms = performance.now() - start;
  const text = await res.text();
  return { ok: res.ok, ms, status: res.status, body: text };
}

async function main() {
  if (!API_URL || !SECRET) {
    console.error("Set API_URL and WHATSAPP_APP_SECRET (or META_APP_SECRET)");
    process.exit(1);
  }

  const samples = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    const r = await postWebhook();
    if (!r.ok) {
      console.error(`Webhook failed: ${r.status} ${r.body}`);
      process.exit(1);
    }
    samples.push(r.ms);
  }

  samples.sort((a, b) => a - b);

  const report = {
    certified_at: new Date().toISOString(),
    api_url: API_URL,
    samples: SAMPLES,
    budget_ms_p95: BUDGET_MS,
    ack_ms: {
      p50: Math.round(percentile(samples, 50)),
      p95: Math.round(percentile(samples, 95)),
      max: Math.round(samples[samples.length - 1] ?? 0),
    },
    pass_p95: percentile(samples, 95) <= BUDGET_MS,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass_p95 ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
