import { assessAnswerability } from "./answerability";

describe("answerability", () => {
  it("blocks when KB not indexed", () => {
    const r = assessAnswerability({
      groundingConfidence: 0.9,
      hasIndexedChunks: false,
      knowledgeGap: false,
      knowledgeHitCount: 1,
    });
    expect(r.canAutoSendFaq).toBe(false);
    expect(r.score).toBe(0);
  });

  it("allows FAQ when grounding is strong", () => {
    const r = assessAnswerability({
      groundingConfidence: 0.82,
      hasIndexedChunks: true,
      topSimilarity: 0.88,
      knowledgeGap: false,
      knowledgeHitCount: 2,
    });
    expect(r.canAutoSendFaq).toBe(true);
    expect(r.canAutoSendPricing).toBe(true);
  });

  it("blocks FAQ on knowledge gap", () => {
    const r = assessAnswerability({
      groundingConfidence: 0.5,
      hasIndexedChunks: true,
      topSimilarity: 0.4,
      knowledgeGap: true,
      knowledgeHitCount: 0,
    });
    expect(r.canAutoSendFaq).toBe(false);
  });
});
