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

  it("auto-sends warm greeting on auto_guarded + Growth without knowledge docs", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: {
          ...baseInput().ctx,
          lastInbound: "Hello",
        },
      }),
    );
    expect(decision.mode).toBe("send");
    expect(decision.reasons.some((r) => r.includes("greeting"))).toBe(true);
  });

  it("drafts (not sends) pricing threads without knowledge docs", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: {
          ...baseInput().ctx,
          lastInbound: "What is your pricing for 10 users?",
        },
      }),
    );
    expect(decision.mode).toBe("draft");
    expect(decision.blockers).toContain("auto_send_no_knowledge");
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
