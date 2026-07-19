import { PipelineSpans, buildPipelineTurnMetrics } from "./pipeline-spans";

describe("PipelineSpans", () => {
  it("records stage durations", async () => {
    const spans = new PipelineSpans();
    spans.mark("a");
    await new Promise((r) => setTimeout(r, 5));
    spans.measure("a_ms", "a");
    expect(spans.spans.a_ms).toBeGreaterThanOrEqual(4);
    expect(spans.toJSON().total_ms).toBeGreaterThanOrEqual(4);
  });
});

describe("buildPipelineTurnMetrics", () => {
  it("captures grounding and policy fields", () => {
    const metrics = buildPipelineTurnMetrics({
      executionPath: "standard",
      replyDecision: {
        mode: "draft",
        confidence: 0.72,
        risk: "medium",
        reasons: ["No matching doc"],
        blockers: ["knowledge_gap"],
        evaluatedAt: new Date().toISOString(),
        autoEligible: false,
      },
      knowledgeHits: [
        {
          chunkId: "c1",
          documentId: "d1",
          title: "Pricing",
          content: "₹999",
          similarity: 0.82,
          category: "pricing",
          citation: "Pricing (82% match)",
        },
      ],
      knowledgeGap: true,
      stageChanged: true,
      safetyBlocked: { code: "safety_velocity" },
      fastPath: false,
    });

    expect(metrics).toMatchObject({
      executionPath: "standard",
      replyMode: "draft",
      groundingPercent: 82,
      knowledgeHitCount: 1,
      knowledgeGap: true,
      stageChanged: true,
      safetyBlocked: "safety_velocity",
      blockers: ["knowledge_gap"],
      fastPath: false,
    });
  });

  it("uses null grounding when no knowledge hits", () => {
    const metrics = buildPipelineTurnMetrics({
      executionPath: "fast",
      replyDecision: {
        mode: "send",
        confidence: 0.9,
        risk: "low",
        reasons: [],
        evaluatedAt: new Date().toISOString(),
        autoEligible: true,
      },
      knowledgeHits: [],
      knowledgeGap: false,
      stageChanged: false,
      fastPath: true,
    });

    expect(metrics.groundingPercent).toBeNull();
    expect(metrics.retrievalConfidence).toBeNull();
    expect(metrics.knowledgeHitCount).toBe(0);
    expect(metrics.replyMode).toBe("send");
  });

  it("includes judgment shadow when classification provided", () => {
    const metrics = buildPipelineTurnMetrics({
      executionPath: "standard",
      replyDecision: {
        mode: "draft",
        confidence: 0.7,
        risk: "medium",
        reasons: [],
        evaluatedAt: new Date().toISOString(),
      },
      knowledgeHits: [],
      knowledgeGap: false,
      stageChanged: false,
      classification: {
        customerNeeds: ["Price", "Delivery"],
        language: "hinglish",
        dealTemperature: "warm",
        requiresOwner: false,
        apologyRequired: true,
        recoveryMode: false,
      },
    });
    expect(metrics.judgment).toEqual({
      customerNeedsCount: 2,
      language: "hinglish",
      dealTemperature: "warm",
      requiresOwner: false,
      apologyRequired: true,
      recoveryMode: false,
    });
  });

  it("uses category-aware retrieval confidence when provided", () => {
    const metrics = buildPipelineTurnMetrics({
      executionPath: "standard",
      replyDecision: {
        mode: "draft",
        confidence: 0.7,
        risk: "medium",
        reasons: [],
        evaluatedAt: new Date().toISOString(),
      },
      knowledgeHits: [
        {
          chunkId: "c1",
          documentId: "d1",
          title: "Pricing",
          content: "₹999",
          similarity: 0.72,
          category: "pricing",
          citation: "Pricing (72% match)",
        },
      ],
      knowledgeGap: false,
      stageChanged: false,
      groundingConfidence: 0.82,
    });
    expect(metrics.retrievalConfidence).toBe(82);
    expect(metrics.groundingPercent).toBe(72);
  });
});
