import type { KnowledgeHit } from "./intelligence";
import {
  buildRetrievalResult,
  computeGapRiskScore,
  computeGroundingConfidence,
  detectMissingTopics,
  rankKnowledgeHits,
  resolveRetrievalCategories,
} from "./knowledge-retrieval";

function hit(
  partial: Partial<KnowledgeHit> & Pick<KnowledgeHit, "category" | "similarity">,
): KnowledgeHit {
  return {
    chunkId: "c1",
    documentId: "d1",
    title: partial.title ?? "Doc",
    content: partial.content ?? "content",
    citation: "Doc",
    ...partial,
  };
}

describe("knowledge-retrieval", () => {
  it("routes pricing intents to pricing + product categories", () => {
    expect(resolveRetrievalCategories("pricing")).toEqual(["pricing", "product"]);
    expect(resolveRetrievalCategories("complaint")).toEqual(["policy", "faq"]);
    expect(resolveRetrievalCategories("greeting")).toBeUndefined();
  });

  it("detects pricing gap when no hits", () => {
    expect(
      detectMissingTopics({
        intentKind: "pricing",
        lastInbound: "What is the price?",
        hits: [],
        hasIndexedChunks: true,
      }),
    ).toEqual(["pricing or packages"]);
  });

  it("detects policy gap for complaints", () => {
    expect(
      detectMissingTopics({
        intentKind: "complaint",
        lastInbound: "I want a refund",
        hits: [],
        hasIndexedChunks: true,
      }),
    ).toEqual(["policy or returns"]);
  });

  it("detects delivery gap from customerNeeds", () => {
    expect(
      detectMissingTopics({
        lastInbound: "Price and delivery?",
        customerNeeds: ["Price", "Delivery timeline"],
        hits: [hit({ category: "pricing", similarity: 0.8, content: "₹50,000 package" })],
        hasIndexedChunks: true,
      }),
    ).toContain("delivery or shipping");
  });

  it("ranks preferred categories above raw similarity", () => {
    const ranked = rankKnowledgeHits(
      [
        hit({ category: "general", similarity: 0.9, title: "About us" }),
        hit({ category: "pricing", similarity: 0.75, title: "Rate card" }),
      ],
      ["pricing", "product"],
    );
    expect(ranked[0].category).toBe("pricing");
  });

  it("computes grounding confidence with category boost", () => {
    const confidence = computeGroundingConfidence(
      [hit({ category: "pricing", similarity: 0.72 })],
      ["pricing", "product"],
    );
    expect(confidence).toBe(0.82);
  });

  it("buildRetrievalResult bundles hits, gaps, and confidence", () => {
    const result = buildRetrievalResult({
      hits: [],
      intentKind: "pricing",
      lastInbound: "Quote please",
      hasIndexedChunks: true,
    });
    expect(result.missingTopics).toEqual(["pricing or packages"]);
    expect(result.groundingConfidence).toBe(0);
    expect(result.categoriesUsed).toEqual(["pricing", "product"]);
  });

  it("scores gap risk from chunk coverage", () => {
    expect(computeGapRiskScore({ chunkCount: 0, docCount: 0 })).toBe(100);
    expect(computeGapRiskScore({ chunkCount: 3, docCount: 1 })).toBe(80);
    expect(computeGapRiskScore({ chunkCount: 20, docCount: 3 })).toBe(15);
  });
});
