import {
  buildRagQuery,
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

  it("returns playbook per intent kind", () => {
    expect(playbookForIntent("greeting")).toMatch(/Greeting/i);
    expect(playbookForIntent("pricing")).toMatch(/pricing/i);
  });
});
