import { ReplyPolicyService, type ReplyPolicyInput } from "./reply-policy.service";
import type { ConversationContext } from "./context-builder.service";

function baseInput(overrides: Partial<ReplyPolicyInput> = {}): ReplyPolicyInput {
  const ctx = {
    conversation: { aiEnabled: true },
    lead: { stage: "NEGOTIATION" },
    lastInbound: "Hello",
  } as ConversationContext;

  return {
    ctx,
    classification: {
      stage: "NEGOTIATION",
      confidence: 0.6,
      intent: "Pricing inquiry",
      sentiment: "neutral",
      suggestedActions: [],
      requiresHuman: false,
    },
    knowledgeHits: [],
    knowledgeGap: false,
    workspaceAutonomy: "auto_guarded",
    withinReplyWindow: true,
    autoSendPlanOk: true,
    recentAutoSendCount: 0,
    ...overrides,
  };
}

describe("ReplyPolicyService", () => {
  const service = new ReplyPolicyService({} as never);

  it("auto-sends on auto_guarded for Hello without knowledge docs", () => {
    const decision = service.evaluate(baseInput());
    expect(decision.mode).toBe("send");
  });

  it("auto-sends Hello test in negotiation thread without KB", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: { ...baseInput().ctx, lastInbound: "Hello test" },
      }),
    );
    expect(decision.mode).toBe("send");
  });

  it("auto-sends pricing questions without KB (composer enforces no invented prices)", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: {
          ...baseInput().ctx,
          lastInbound: "What is your pricing for 10 users?",
        },
        knowledgeGap: true,
      }),
    );
    expect(decision.mode).toBe("send");
  });

  it("drafts when customer explicitly needs a human", () => {
    const decision = service.evaluate(
      baseInput({
        classification: {
          ...baseInput().classification,
          requiresHuman: true,
        },
      }),
    );
    expect(decision.mode).toBe("draft");
    expect(decision.blockers).toContain("auto_send_handoff");
  });

  it("drafts on refund/complaint in latest message", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: { ...baseInput().ctx, lastInbound: "I want a refund now" },
      }),
    );
    expect(decision.mode).toBe("draft");
    expect(decision.blockers).toContain("auto_send_sensitive");
  });

  it("assist mode never auto-sends", () => {
    const decision = service.evaluate(
      baseInput({ workspaceAutonomy: "assist" }),
    );
    expect(decision.mode).toBe("draft");
  });

  it("skips when human reply mode is on", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: {
          ...baseInput().ctx,
          conversation: { aiEnabled: false } as ConversationContext["conversation"],
        },
      }),
    );
    expect(decision.mode).toBe("skip");
  });
});
