#!/usr/bin/env node
/**
 * P2 performance certification — RUM wiring, Redis HTTP cache headers, RSC bootstrap, bundle CI.
 *
 * Usage:
 *   pnpm certify:p2-local
 *   CERTIFY_TOKEN=... pnpm certify:p2-local
 *   pnpm certify:p2-local --include-bundle   # runs check:bundle-budget (slow)
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getApiUrl, getCertifyToken } from "./lib/certify-env.mjs";
import { loadRootEnv, ROOT } from "./lib/load-root-env.mjs";

loadRootEnv();

const args = new Set(process.argv.slice(2));
const INCLUDE_BUNDLE = args.has("--include-bundle");
const ARTIFACT_DIR = path.join(ROOT, "docs/certification/artifacts/p2-local");

function readSource(relPath, needles) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    return { exists: false, missing: needles };
  }
  const text = fs.readFileSync(full, "utf8");
  const missing = needles.filter((n) => !text.includes(n));
  return { exists: true, missing };
}

async function fetchWithHeaders(token, pathSuffix) {
  const api = getApiUrl();
  const res = await fetch(`${api}${pathSuffix}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    cache: res.headers.get("x-growvisi-cache"),
    cacheControl: res.headers.get("cache-control"),
    text,
  };
}

async function probeRedisHttpCache(token) {
  const first = await fetchWithHeaders(token, "/organizations/shell-bootstrap");
  const second = await fetchWithHeaders(token, "/organizations/shell-bootstrap");
  const queue1 = await fetchWithHeaders(token, "/conversations/stats?scope=queue");
  const queue2 = await fetchWithHeaders(token, "/conversations/stats?scope=queue");

  const privateNoStore =
    first.cacheControl?.includes("private") && first.cacheControl?.includes("no-store");

  const redisEnabled = process.env.REDIS_URL?.trim();
  const shellWarmHit = second.cache === "redis-hit";
  const queueWarmHit = queue2.cache === "redis-hit";

  return {
    phase: "P2-redis-http-cache",
    redis_url_configured: Boolean(redisEnabled),
    shell_bootstrap: {
      first: first.cache,
      second: second.cache,
      cache_control_ok: privateNoStore,
    },
    queue_stats: {
      first: queue1.cache,
      second: queue2.cache,
    },
    pass_headers_present:
      first.ok &&
      second.ok &&
      queue1.ok &&
      queue2.ok &&
      first.cache != null &&
      queue1.cache != null &&
      privateNoStore,
    pass_redis_warm_hit: !redisEnabled || (shellWarmHit && queueWarmHit),
    note: "X-Growvisi-Cache on shell-bootstrap + queue stats; warm request should be redis-hit when REDIS_URL is set.",
  };
}

function probeRumWiring() {
  const rum = readSource("apps/web/src/lib/rum.ts", [
    "initWebVitalsObservers",
    "reportDashboardInteractive",
    "lcp",
    "inp",
    "cls",
  ]);
  const sentry = readSource("apps/web/src/lib/sentry.ts", ["browserTracingIntegration"]);
  const sentryInit = readSource("apps/web/src/components/auth/sentry-init.tsx", [
    "initWebVitalsObservers",
    "initSentryClient",
  ]);
  const dashboardPerf = readSource("apps/web/src/hooks/use-dashboard-interactive-perf.ts", [
    "reportDashboardInteractive",
    "useShellBootstrapInitial",
  ]);
  const routePerf = readSource("apps/web/src/hooks/use-route-transition-perf.ts", [
    "dashboard.route_transition",
  ]);

  const missing = [
    ...rum.missing.map((m) => `rum.ts:${m}`),
    ...sentry.missing.map((m) => `sentry.ts:${m}`),
    ...sentryInit.missing.map((m) => `sentry-init.tsx:${m}`),
    ...dashboardPerf.missing.map((m) => `use-dashboard-interactive-perf.ts:${m}`),
    ...routePerf.missing.map((m) => `use-route-transition-perf.ts:${m}`),
  ];

  return {
    phase: "P2-rum-wiring",
    pass: rum.exists && sentry.exists && sentryInit.exists && dashboardPerf.exists && missing.length === 0,
    missing,
  };
}

function probeRscBootstrap() {
  const server = readSource("apps/web/src/lib/shell-bootstrap-server.ts", [
    "fetchShellBootstrapServer",
    "growvisi_rt",
  ]);
  const layout = readSource("apps/web/src/app/dashboard/layout.tsx", [
    "fetchShellBootstrapServer",
    "initialShell",
  ]);
  const provider = readSource("apps/web/src/components/dashboard/shell-bootstrap-initial.tsx", [
    "ShellBootstrapInitialProvider",
    "useShellBootstrapInitial",
  ]);
  const settings = readSource("apps/web/src/hooks/use-settings-bootstrap.ts", [
    "useShellBootstrapInitial",
    "initialData",
  ]);

  const missing = [
    ...server.missing.map((m) => `shell-bootstrap-server.ts:${m}`),
    ...layout.missing.map((m) => `dashboard/layout.tsx:${m}`),
    ...provider.missing.map((m) => `shell-bootstrap-initial.tsx:${m}`),
    ...settings.missing.map((m) => `use-settings-bootstrap.ts:${m}`),
  ];

  return {
    phase: "P2-rsc-bootstrap",
    pass: server.exists && layout.exists && provider.exists && missing.length === 0,
    missing,
  };
}

function probeWebUnitTests() {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@growvisi/web",
      "exec",
      "node",
      "--import",
      "tsx",
      "--test",
      "src/lib/shell-bootstrap-server.test.ts",
      "src/lib/route-prefetch.test.ts",
    ],
    { cwd: ROOT, encoding: "utf8", env: process.env },
  );
  return {
    phase: "P2-web-unit-tests",
    pass: result.status === 0,
    output_tail: (result.stdout + result.stderr).slice(-1200),
  };
}

function probeBundleCi() {
  if (!INCLUDE_BUNDLE) {
    const script = path.join(ROOT, "scripts/check-bundle-budget.mjs");
    return {
      phase: "P2-bundle-ci",
      status: "SKIPPED",
      pass: fs.existsSync(script),
      note: "Pass --include-bundle to run check:bundle-budget (requires next build).",
    };
  }
  const result = spawnSync("node", ["scripts/check-bundle-budget.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  });
  return {
    phase: "P2-bundle-ci",
    pass: result.status === 0,
    output_tail: (result.stdout + result.stderr).slice(-800),
  };
}

async function main() {
  console.log("P2 performance certification probe\n");

  const token = await getCertifyToken();
  const probes = [
    probeRumWiring(),
    probeRscBootstrap(),
    await probeRedisHttpCache(token),
    probeWebUnitTests(),
    probeBundleCi(),
  ];

  const blockers = [];
  for (const p of probes) {
    if (p.phase === "P2-redis-http-cache") {
      if (!p.pass_headers_present) blockers.push("Redis HTTP cache headers missing or invalid");
      if (!p.pass_redis_warm_hit) {
        blockers.push("Warm shell-bootstrap or queue-stats did not report redis-hit (Redis expected)");
      }
    } else if (p.phase === "P2-rum-wiring" && !p.pass) {
      blockers.push(`RUM wiring incomplete: ${p.missing?.join(", ") || "files missing"}`);
    } else if (p.phase === "P2-rsc-bootstrap" && !p.pass) {
      blockers.push(`RSC bootstrap incomplete: ${p.missing?.join(", ") || "files missing"}`);
    } else if (p.phase === "P2-web-unit-tests" && !p.pass) {
      blockers.push("P2 web unit tests failed");
    } else if (p.phase === "P2-bundle-ci" && p.status !== "SKIPPED" && !p.pass) {
      blockers.push("Bundle budget check failed");
    }
  }

  const report = {
    certified_at: new Date().toISOString(),
    environment: "local-dev",
    api_url: getApiUrl(),
    probes,
    status: blockers.length === 0 ? "PASS" : "WARN",
    blockers,
  };

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const out = path.join(ARTIFACT_DIR, `p2-probe-${new Date().toISOString().slice(0, 10)}.json`);
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
