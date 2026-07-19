/**
 * HTTP latency probe against deployed API (internal/cron/latency-probe).
 * Use after deploy when local dist differs from production.
 *
 * Usage:
 *   node apps/api/scripts/pipeline-http-probe.mjs [greeting|thanks|pricing|probe-batch] [--runs=3]
 *
 * Requires: CRON_SECRET, API_URL (default https://api.growvisi.in)
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  buildBaselineReport,
  sanitizeEnv,
} from "./pipeline-baseline-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, "../.env.production.local"));
loadEnvFile(join(__dirname, "../../../.env"));

const API_URL = (
  sanitizeEnv(process.env.API_URL)?.includes("growvisi")
    ? sanitizeEnv(process.env.API_URL)
    : "https://api.growvisi.in"
).replace(/\/$/, "");
const CONVERSATION_ID = process.env.LATENCY_TEST_CONVERSATION_ID || "cmrq48t840002lb04e1yd6532";
const SCENARIOS = {
  greeting: "Hi",
  thanks: "Thanks!",
  pricing: "What are your pricing plans?",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRunsArg() {
  const flag = process.argv.find((a) => a.startsWith("--runs="));
  if (flag) return Math.max(1, parseInt(flag.split("=")[1], 10) || 1);
  return parseInt(process.env.PROBE_RUNS || "1", 10);
}

async function probeHttp(message) {
  const secret = sanitizeEnv(process.env.CRON_SECRET);
  if (!secret) throw new Error("CRON_SECRET required for HTTP probe");

  const url = new URL(`${API_URL}/api/v1/internal/cron/latency-probe`);
  url.searchParams.set("conversationId", CONVERSATION_ID);
  url.searchParams.set("message", message);

  const started = Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const wallMs = Date.now() - started;
  const body = await res.json();

  if (!res.ok || !body.ok) {
    throw new Error(`Probe failed ${res.status}: ${JSON.stringify(body)}`);
  }

  return {
    ...body,
    http_wall_ms: wallMs,
    classify_latency_ms: body.classify_run?.latencyMs ?? null,
    compose_latency_ms: body.compose_run?.latencyMs ?? null,
    process_wall_ms: body.process_wall_ms,
  };
}

async function main() {
  const mode = process.argv[2] || "probe-batch";
  const runsPerScenario = mode === "probe-batch" ? parseRunsArg() : 1;

  const scenarioKeys =
    mode === "probe-batch" || mode === "all"
      ? Object.keys(SCENARIOS)
      : SCENARIOS[mode]
        ? [mode]
        : null;

  const texts =
    scenarioKeys === null
      ? [mode]
      : scenarioKeys.flatMap((key) => {
          const base = SCENARIOS[key];
          return Array.from({ length: runsPerScenario }, (_, i) =>
            runsPerScenario > 1 ? `${base} #${i + 1}` : base,
          );
        });

  const results = [];
  for (let i = 0; i < texts.length; i++) {
    console.error(`Probe ${i + 1}/${texts.length}: "${texts[i]}"`);
    results.push(await probeHttp(texts[i]));
    if (i < texts.length - 1) await sleep(2500);
  }

  const report = buildBaselineReport(results);
  console.log(
    JSON.stringify(
      {
        api_url: API_URL,
        conversation_id: CONVERSATION_ID,
        mode,
        runs_per_scenario: runsPerScenario,
        baseline: report,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
