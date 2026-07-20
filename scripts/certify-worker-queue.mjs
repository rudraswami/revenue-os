#!/usr/bin/env node
/**
 * Verify BullMQ worker host configuration and queue health endpoint.
 *
 * Usage:
 *   pnpm certify:worker-queue
 *   API_URL=http://127.0.0.1:4000/api/v1 pnpm certify:worker-queue
 */
import fs from "node:fs";
import path from "node:path";
import { getApiUrl } from "./lib/certify-env.mjs";
import { loadRootEnv, ROOT } from "./lib/load-root-env.mjs";

loadRootEnv();

const ARTIFACT_DIR = path.join(ROOT, "docs/certification/artifacts/worker-queue");

async function main() {
  const api = getApiUrl();
  const [healthRes, queuesRes] = await Promise.all([
    fetch(`${api}/health`),
    fetch(`${api}/health/queues`),
  ]);

  const health = await healthRes.json().catch(() => ({}));
  const queues = await queuesRes.json().catch(() => ({}));

  const report = {
    certified_at: new Date().toISOString(),
    api_url: api,
    health_status: healthRes.status,
    queues_status: queuesRes.status,
    process_role: health.processRole ?? queues.processRole ?? "unknown",
    queue_mode: health.checks?.queueMode ?? queues.queueMode ?? "unknown",
    workers_enabled: health.checks?.workersEnabled ?? queues.workersEnabled ?? false,
    redis: health.checks?.redis ?? "unknown",
    queue_counts: queues.queues ?? null,
    checks: {
      health_ok: healthRes.ok && health.status !== "degraded",
      queues_endpoint_ok: queuesRes.ok,
      background_workers_on_process: queues.workersEnabled === true,
      queue_counts_present: queues.queues != null,
    },
    note:
      queues.queues == null
        ? "This API process does not run BullMQ consumers. Deploy apps/api with WORKER_ONLY=1 on Railway/Fly for production worker host."
        : "BullMQ processors active on this process.",
  };

  const blockers = [];
  if (!report.checks.health_ok) blockers.push("Health check failed or degraded");
  if (!report.checks.queues_endpoint_ok) blockers.push("/health/queues unreachable");

  report.status =
    blockers.length === 0
      ? report.checks.background_workers_on_process
        ? "PASS"
        : "PASS_API_ONLY"
      : "FAIL";
  report.blockers = blockers;

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const out = path.join(ARTIFACT_DIR, `worker-queue-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nArtifact: ${out}`);

  if (blockers.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
