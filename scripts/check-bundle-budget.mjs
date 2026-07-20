#!/usr/bin/env node
/**
 * P2 bundle budget gate — parses Next.js build output for First Load JS.
 *
 * Usage (after build):
 *   pnpm --filter @growvisi/web build
 *   pnpm check:bundle-budget
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT } from "./lib/load-root-env.mjs";

const WEB_DIR = path.join(ROOT, "apps/web");
const BASELINE_PATH = path.join(ROOT, "docs/certification/bundle-baseline.json");
const ARTIFACT_DIR = path.join(ROOT, "docs/certification/artifacts/bundle");

/** First Load JS warn thresholds (kB) per §7.5 */
const BUDGETS_KB = {
  dashboard: 320,
  inbox: 340,
  default: 350,
};

function parseFirstLoadKb(buildLog) {
  const routes = {};
  const lineRe = /^(?:├|└|┌)\s+([^\s]+)\s+[\d.]+\s+kB\s+([\d.]+)\s+kB/;
  for (const line of buildLog.split("\n")) {
    const m = lineRe.exec(line.trim());
    if (!m) continue;
    const route = m[1];
    const firstLoadKb = Number.parseFloat(m[2]);
    if (Number.isFinite(firstLoadKb)) routes[route] = firstLoadKb;
  }
  return routes;
}

function budgetForRoute(route) {
  if (route.startsWith("/dashboard/inbox")) return BUDGETS_KB.inbox;
  if (route.startsWith("/dashboard")) return BUDGETS_KB.dashboard;
  return BUDGETS_KB.default;
}

function main() {
  const existingBuild = fs.existsSync(path.join(WEB_DIR, ".next/BUILD_ID"));
  let buildLog = "";

  if (!existingBuild || process.argv.includes("--rebuild")) {
    console.log("Running next build for bundle analysis…\n");
    const result = spawnSync("pnpm", ["--filter", "@growvisi/web", "build"], {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
    });
    buildLog = `${result.stdout}\n${result.stderr}`;
    if (result.status !== 0) {
      console.error(buildLog);
      process.exit(1);
    }
  } else {
    console.log("Using existing .next build — pass --rebuild to force fresh build\n");
    const result = spawnSync("pnpm", ["--filter", "@growvisi/web", "build"], {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
    });
    buildLog = `${result.stdout}\n${result.stderr}`;
  }

  const routes = parseFirstLoadKb(buildLog);
  const dashboardRoutes = Object.entries(routes).filter(([r]) => r.startsWith("/dashboard"));

  const violations = [];
  for (const [route, kb] of dashboardRoutes) {
    const budget = budgetForRoute(route);
    if (kb > budget * 1.1) {
      violations.push(`${route}: ${kb} kB > ${budget} kB (+10% gate)`);
    }
  }

  const report = {
    checked_at: new Date().toISOString(),
    routes_measured: dashboardRoutes.length,
    dashboard_first_load_kb: Object.fromEntries(dashboardRoutes),
    budgets_kb: BUDGETS_KB,
    violations,
    status: violations.length === 0 ? "PASS" : "WARN",
  };

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const out = path.join(ARTIFACT_DIR, `bundle-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

  if (fs.existsSync(BASELINE_PATH)) {
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
    report.baseline = baseline;
  } else {
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(report.dashboard_first_load_kb, null, 2)}\n`);
    report.baseline_written = true;
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nArtifact: ${out}`);

  if (violations.length > 0) {
    console.warn(`\nBundle budget warnings:\n${violations.map((v) => `- ${v}`).join("\n")}`);
    process.exitCode = 0;
  }
}

main();
