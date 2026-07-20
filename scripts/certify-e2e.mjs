#!/usr/bin/env node
/**
 * Full E2E certification — Playwright inbox + dashboard specs with CI webservers.
 *
 * Usage:
 *   pnpm certify:e2e
 *   E2E_EMAIL=demo@growvisi.com E2E_PASSWORD=demo123456 pnpm certify:e2e
 *
 * Prerequisites (local): postgres + redis, db:push, db:seed, seed:inbox-cert, pnpm build
 * CI runs this automatically after build + seed.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, loadRootEnv } from "./lib/load-root-env.mjs";

loadRootEnv();

const ARTIFACT_DIR = path.join(ROOT, "docs/certification/artifacts/e2e");

function run(cmd, args, env = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result;
}

function latestInboxArtifacts() {
  const inboxDir = path.join(ROOT, "docs/certification/artifacts/inbox");
  if (!fs.existsSync(inboxDir)) return [];
  return fs
    .readdirSync(inboxDir)
    .filter((f) => f.endsWith(".json") && f.startsWith("phase-"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(inboxDir, f), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function main() {
  console.log("E2E certification — seed inbox fixture + Playwright\n");

  const seed = run("pnpm", ["seed:inbox-cert"]);
  if (seed.status !== 0) {
    console.warn("seed:inbox-cert:", seed.stderr || seed.stdout);
  }

  const env = {
    CI: "true",
    E2E_EMAIL: process.env.E2E_EMAIL || "demo@growvisi.com",
    E2E_PASSWORD: process.env.E2E_PASSWORD || "demo123456",
    JWT_SECRET: process.env.JWT_SECRET || "ci-test-secret-minimum-32-characters-long",
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://revenue_os:revenue_os_dev@localhost:5432/revenue_os",
    DIRECT_URL:
      process.env.DIRECT_URL ||
      "postgresql://revenue_os:revenue_os_dev@localhost:5432/revenue_os",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1",
  };

  const playwright = run(
    "pnpm",
    [
      "--filter",
      "@growvisi/web",
      "exec",
      "playwright",
      "test",
      "e2e/dashboard-smoke.spec.ts",
      "e2e/inbox-thread-bundle-cert.spec.ts",
      "e2e/inbox-ux-cert.spec.ts",
    ],
    env,
  );

  if (playwright.stdout) console.log(playwright.stdout);
  if (playwright.stderr) console.error(playwright.stderr);

  const artifacts = latestInboxArtifacts();
  const phases = artifacts.reduce(
    (acc, a) => {
      const key = String(a.phase ?? "unknown");
      acc[key] = { verdict: a.verdict ?? a.status, certified_at: a.certified_at };
      return acc;
    },
    {} as Record<string, { verdict: string; certified_at?: string }>,
  );

  const report = {
    certified_at: new Date().toISOString(),
    environment: env.CI ? "ci-local" : "local",
    playwright_exit_code: playwright.status ?? 1,
    phases,
    verdict: playwright.status === 0 ? "PASS" : "FAIL",
  };

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const out = path.join(ARTIFACT_DIR, `e2e-cert-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\nSummary: ${report.verdict}`);
  console.log(`Artifact: ${out}`);

  process.exit(playwright.status === 0 ? 0 : 1);
}

main();
