import {
  applyClassificationJudgmentGuards,
  buildJudgmentRagQuery,
  classificationNeedsHuman,
  normalizeClassificationResult,
} from "./classification-judgment";

describe("classification-judgment", () => {
  const base = {
    stage: "QUALIFIED" as const,
    confidence: 0.8,
    intent: "Pricing inquiry",
    sentiment: "neutral" as const,
    suggestedActions: ["Send rate card"],
    requiresHuman: false,
    summary: "Customer asked about pricing",
    tags: ["price-sensitive"],
    nextAction: "Share pricing",
  };

  it("merges judgment fields from raw LLM output", () => {
    const result = normalizeClassificationResult(base, {
      customerNeeds: ["Price for 10 users", "EMI options"],
      replyBrief: "Answer price and EMI; ask timeline if missing.",
      language: "hinglish",
      dealTemperature: "warm",
      entities: { product: "Growth plan", budget: "₹50k" },
      apologyRequired: false,
    });
    expect(result.customerNeeds).toHaveLength(2);
    expect(result.replyBrief).toContain("EMI");
    expect(result.language).toBe("hinglish");
    expect(result.entities?.product).toBe("Growth plan");
    expect(result.dealTemperature).toBe("warm");
  });

  it("drops invalid enum values", () => {
    const result = normalizeClassificationResult(base, {
      language: "french",
      dealTemperature: "lukewarm",
    });
    expect(result.language).toBeUndefined();
    expect(result.dealTemperature).toBeUndefined();
  });

  it("caps array sizes", () => {
    const result = normalizeClassificationResult(base, {
      customerNeeds: Array.from({ length: 10 }, (_, i) => `need ${i}`),
    });
    expect(result.customerNeeds).toHaveLength(6);
  });

  it("buildJudgmentRagQuery prefers replyBrief", () => {
    const q = buildJudgmentRagQuery({
      intent: "Pricing",
      summary: "Wants quote",
      replyBrief: "Price + delivery for modular kitchen",
      entities: { product: "modular kitchen" },
      customerNeeds: ["EMI"],
    });
    expect(q).toContain("Price + delivery");
    expect(q).toContain("modular kitchen");
  });

  it("applyClassificationJudgmentGuards promotes requiresOwner to requiresHuman", () => {
    const guarded = applyClassificationJudgmentGuards({
      stage: "PROPOSAL",
      confidence: 0.8,
      intent: "Enterprise",
      sentiment: "neutral",
      suggestedActions: [],
      requiresHuman: false,
      requiresOwner: true,
    });
    expect(guarded.requiresHuman).toBe(true);
  });

  it("classificationNeedsHuman covers recovery mode", () => {
    expect(
      classificationNeedsHuman({
        stage: "NEGOTIATION",
        confidence: 0.7,
        intent: "Complaint",
        sentiment: "negative",
        suggestedActions: [],
        requiresHuman: false,
        recoveryMode: true,
      }),
    ).toBe(true);
  });
});
