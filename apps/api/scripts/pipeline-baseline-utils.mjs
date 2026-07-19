/** Shared helpers for pipeline latency baseline probes. */

export function sanitizeEnv(value) {
  if (value == null) return undefined;
  let v = String(value).replace(/\r/g, "").trim();
  while (/\\r\\n$|\\n$|\\r$/.test(v)) {
    v = v.replace(/\\r\\n$|\\n$|\\r$/, "").trim();
  }
  return v || undefined;
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export function summarizeNumeric(values) {
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) {
    return { n: 0, min: null, p50: null, p95: null, max: null, avg: null };
  }
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    n: nums.length,
    min: nums[0],
    p50: percentile(nums, 50),
    p95: percentile(nums, 95),
    max: nums[nums.length - 1],
    avg: Math.round(sum / nums.length),
  };
}

export function summarizeBlockers(runs) {
  const counts = {};
  for (const run of runs) {
    const blockers = run.metrics?.blockers ?? run.blockers ?? [];
    if (blockers.length === 0) {
      counts.none = (counts.none ?? 0) + 1;
      continue;
    }
    for (const code of blockers) {
      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return counts;
}

export function buildBaselineReport(runs) {
  const classifyLatency = runs.map((r) => r.classify_run?.latencyMs ?? r.classify_latency_ms);
  const composeLatency = runs.map((r) => r.compose_run?.latencyMs ?? r.compose_latency_ms);
  const processWall = runs.map((r) => r.process_wall_ms);
  const customerE2e = runs.map((r) => r.customer_e2e_ms);

  const paths = {};
  for (const run of runs) {
    const path =
      run.metrics?.executionPath ??
      run.execution_path ??
      run.classify_run?.output?.executionPath ??
      "unknown";
    paths[path] = (paths[path] ?? 0) + 1;
  }

  const replyModes = {};
  for (const run of runs) {
    const mode = run.metrics?.replyMode ?? run.reply_mode ?? "unknown";
    replyModes[mode] = (replyModes[mode] ?? 0) + 1;
  }

  return {
    generated_at: new Date().toISOString(),
    sample_size: runs.length,
    latency_ms: {
      process_wall: summarizeNumeric(processWall),
      classify: summarizeNumeric(classifyLatency),
      compose: summarizeNumeric(composeLatency),
      customer_e2e: summarizeNumeric(customerE2e),
    },
    execution_paths: paths,
    reply_modes: replyModes,
    blocker_distribution: summarizeBlockers(runs),
    runs,
  };
}
