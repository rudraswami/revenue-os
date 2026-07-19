import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBaselineReport, summarizeNumeric, summarizeBlockers } from "./pipeline-baseline-utils.mjs";

describe("pipeline-baseline-utils", () => {
  it("summarizeNumeric computes percentiles", () => {
    const s = summarizeNumeric([100, 200, 300, 400, 500]);
    assert.equal(s.n, 5);
    assert.equal(s.p50, 300);
    assert.equal(s.min, 100);
    assert.equal(s.max, 500);
  });

  it("summarizeBlockers counts codes", () => {
    const counts = summarizeBlockers([
      { metrics: { blockers: ["knowledge_gap"] } },
      { metrics: { blockers: [] } },
      { blockers: ["human_handling"] },
    ]);
    assert.equal(counts.knowledge_gap, 1);
    assert.equal(counts.none, 1);
    assert.equal(counts.human_handling, 1);
  });

  it("buildBaselineReport aggregates runs", () => {
    const report = buildBaselineReport([
      {
        process_wall_ms: 1000,
        customer_e2e_ms: 2000,
        classify_latency_ms: 500,
        compose_latency_ms: 300,
        metrics: { executionPath: "fast", replyMode: "draft", blockers: [] },
      },
      {
        process_wall_ms: 2000,
        customer_e2e_ms: null,
        classify_latency_ms: 800,
        compose_latency_ms: 400,
        metrics: { executionPath: "standard", replyMode: "send", blockers: ["knowledge_gap"] },
      },
    ]);
    assert.equal(report.sample_size, 2);
    assert.equal(report.latency_ms.classify.p50, 500);
    assert.equal(report.execution_paths.fast, 1);
    assert.equal(report.reply_modes.draft, 1);
    assert.equal(report.blocker_distribution.knowledge_gap, 1);
  });
});
