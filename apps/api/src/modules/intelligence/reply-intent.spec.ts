import {
  assessReplyRisk,
  buildRagQuery,
  isPricingInbound,
  isSensitiveInbound,
  playbookForIntent,
  resolveReplyIntentKind,
} from "./reply-intent";

describe("reply-intent", () => {
  it("detects test check-in messages", () => {
    expect(resolveReplyIntentKind("Hello test", null)).toBe("test_checkin");
    expect(resolveReplyIntentKind("Testing", null)).toBe("test_checkin");
  });

  it("detects greeting vs pricing from latest message", () => {
    expect(resolveReplyIntentKind("Hi", { intent: "Pricing inquiry", stage: "NEGOTIATION" } as never)).toBe(
      "greeting",
    );
    expect(
      resolveReplyIntentKind("What is the price for 5 users?", {
        intent: "Pricing inquiry",
        stage: "NEW",
      } as never),
    ).toBe("pricing");
  });

  it("builds RAG query from message and intent", () => {
    expect(buildRagQuery("Hello", { intent: "Greeting", summary: "New lead" })).toContain("Hello");
    expect(buildRagQuery("Hello", { intent: "Greeting", summary: "New lead" })).toContain("Greeting");
  });

  it("prefers replyBrief for RAG query when present", () => {
    const q = buildRagQuery("price and delivery?", {
      intent: "Pricing",
      replyBrief: "Answer modular kitchen price and delivery timeline",
      customerNeeds: ["Price", "Delivery"],
    });
    expect(q).toContain("modular kitchen");
  });

  it("returns playbook per intent kind", () => {
    expect(playbookForIntent("greeting")).toMatch(/Greeting/i);
    expect(playbookForIntent("pricing")).toMatch(/pricing/i);
  });

  it("detects sensitive and pricing inbound messages", () => {
    expect(isSensitiveInbound("I want a refund")).toBe(true);
    expect(isSensitiveInbound("speak to a manager")).toBe(true);
    expect(isSensitiveInbound("What is the price?")).toBe(false);
    expect(isPricingInbound("What is the price for 5 users?")).toBe(true);
    expect(isPricingInbound("Hello")).toBe(false);
  });

  it("assesses reply risk consistently", () => {
    expect(
      assessReplyRisk({
        lastInbound: "refund please",
        requiresHuman: false,
        knowledgeGap: false,
        knowledgeHitCount: 2,
      }),
    ).toBe("high");
    expect(
      assessReplyRisk({
        lastInbound: "price?",
        knowledgeGap: true,
        knowledgeHitCount: 0,
      }),
    ).toBe("medium");
    expect(
      assessReplyRisk({
        lastInbound: "hello",
        knowledgeGap: false,
        knowledgeHitCount: 1,
      }),
    ).toBe("low");
  });
});
