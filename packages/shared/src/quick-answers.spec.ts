import { matchQuickAnswers, scoreQuickAnswer } from "./quick-answers";
import type { QuickAnswer } from "./intelligence";

const PRICING: QuickAnswer = {
  id: "qa_price",
  question: "What is the price for 2BHK interior?",
  answer: "2BHK interiors start at ₹3.5L including a modular kitchen.",
  keywords: ["price", "cost", "2bhk"],
  category: "pricing",
};

const DELIVERY: QuickAnswer = {
  id: "qa_delivery",
  question: "How long does delivery take?",
  answer: "We deliver within 4–6 weeks after design sign-off.",
  keywords: ["delivery", "timeline"],
};

describe("quick answers matcher", () => {
  it("scores a strong keyword/phrase match high enough to auto-send", () => {
    const score = scoreQuickAnswer("Hi, what's the price for a 2BHK?", PRICING);
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it("returns the matching quick answer as knowledge grounding", () => {
    const hits = matchQuickAnswers("what is the cost of 2bhk interior", [PRICING, DELIVERY]);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunkId).toBe("qa:qa_price");
    expect(hits[0].content).toContain("₹3.5L");
    expect(hits[0].category).toBe("pricing");
  });

  it("does not match unrelated questions", () => {
    const hits = matchQuickAnswers("do you have parking available?", [PRICING, DELIVERY]);
    expect(hits).toHaveLength(0);
  });

  it("ignores single common-word overlaps", () => {
    // Only the stop-ish/common word overlaps — should not falsely match.
    expect(scoreQuickAnswer("how are you", PRICING)).toBe(0);
  });

  it("returns nothing when there are no quick answers", () => {
    expect(matchQuickAnswers("price?", [])).toHaveLength(0);
    expect(matchQuickAnswers("", [PRICING])).toHaveLength(0);
  });

  it("ranks best match first and respects the limit", () => {
    const hits = matchQuickAnswers(
      "price and delivery timeline for 2bhk",
      [PRICING, DELIVERY],
      1,
    );
    expect(hits).toHaveLength(1);
  });
});
