import { buildAutonomyMetricsSnapshot } from "@growvisi/shared";
import { LearningSignalService } from "./learning-signal.service";

describe("LearningSignalService metrics", () => {
  it("buildAutonomyMetricsSnapshot handles empty week", () => {
    const snap = buildAutonomyMetricsSnapshot({
      periodDays: 7,
      classifiedTurns: 0,
      autoSent: 0,
      draftsPlanned: 0,
      draftUsedAsIs: 0,
      draftHeavilyEdited: 0,
      draftRejected: 0,
      blockerCounts: {},
    });
    expect(snap.autoSendRate).toBe(0);
    expect(snap.topBlockers).toEqual([]);
  });

  it("recordTrustRailBlock persists blocker code", async () => {
    const create = jest.fn().mockResolvedValue({ id: "sig1" });
    const prisma = { learningSignal: { create } };
    const service = new LearningSignalService(prisma as never);

    await service.recordTrustRailBlock({
      organizationId: "org1",
      conversationId: "conv1",
      aiRunId: "run1",
      blocker: "compose_grounding",
      reason: "No matching KB chunk",
      intentKind: "pricing",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org1",
        conversationId: "conv1",
        aiRunId: "run1",
        type: "trust_rail_block",
        signal: "compose_grounding",
        metadata: {
          reason: "No matching KB chunk",
          intentKind: "pricing",
        },
      }),
    });
  });

  it("aggregateAutonomyMetrics includes trust rail blockers", async () => {
    const prisma = {
      aiRun: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      learningSignal: {
        findMany: jest.fn().mockResolvedValue([
          { type: "trust_rail_block", signal: "compose_grounding" },
          { type: "trust_rail_block", signal: "compose_grounding" },
          { type: "trust_rail_block", signal: "compose_weak_grounding" },
        ]),
      },
    };
    const service = new LearningSignalService(prisma as never);

    const snap = await service.aggregateAutonomyMetrics("org1", 7);
    expect(snap.topBlockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "compose_grounding", count: 2 }),
        expect.objectContaining({ code: "compose_weak_grounding", count: 1 }),
      ]),
    );
  });
});
