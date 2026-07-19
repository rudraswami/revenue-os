import { buildAutonomyMetricsSnapshot } from "./autonomy-metrics";

describe("autonomy-metrics", () => {
  it("computes rates from counts", () => {
    const snap = buildAutonomyMetricsSnapshot({
      periodDays: 7,
      classifiedTurns: 100,
      autoSent: 25,
      draftsPlanned: 40,
      draftUsedAsIs: 20,
      draftHeavilyEdited: 5,
      draftRejected: 5,
      blockerCounts: { deal_stage: 10, kb_not_indexed: 3 },
    });
    expect(snap.autoSendRate).toBe(0.25);
    expect(snap.draftAcceptanceRate).toBe(0.667);
    expect(snap.topBlockers[0].code).toBe("deal_stage");
  });
});
