import { ReplyPolicyService, type ReplyPolicyInput } from "./reply-policy.service";
import { AutomationPolicyService } from "./automation-policy.service";
import type { ConversationContext } from "./context-builder.service";
import { DEFAULT_INTELLIGENCE_SETTINGS } from "@growvisi/shared";

function baseInput(overrides: Partial<ReplyPolicyInput> = {}): ReplyPolicyInput {
  const ctx = {
    conversation: { aiEnabled: true },
    lead: { stage: "NEW" },
    lastInbound: "Hi",
  } as ConversationContext;

  return {
    ctx,
    classification: {
      stage: "NEW",
      confidence: 0.9,
      intent: "Greeting",
      sentiment: "positive",
      suggestedActions: [],
      requiresHuman: false,
    },
    knowledgeHits: [],
    knowledgeGap: false,
    workspaceAutonomy: "auto_guarded",
    intelligenceSettings: DEFAULT_INTELLIGENCE_SETTINGS,
    withinReplyWindow: true,
    autoSendPlanOk: true,
    executionPath: "fast",
    ...overrides,
  };
}

describe("ReplyPolicyService", () => {
  const service = new ReplyPolicyService({} as never, new AutomationPolicyService());

  it("auto-sends greetings on auto_guarded balanced", () => {
    const decision = service.evaluate(baseInput());
    expect(decision.mode).toBe("send");
  });

  it("drafts pricing without KB on balanced preset", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: {
          ...baseInput().ctx,
          lastInbound: "What is your pricing for 10 users?",
        },
        knowledgeGap: true,
        executionPath: "standard",
      }),
    );
    expect(decision.mode).toBe("draft");
  });

  it("drafts when customer needs a human", () => {
    const decision = service.evaluate(
      baseInput({
        classification: {
          ...baseInput().classification,
          requiresHuman: true,
        },
        executionPath: "human",
      }),
    );
    expect(decision.mode).toBe("draft");
  });

  it("drafts on refund in latest message", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: { ...baseInput().ctx, lastInbound: "I want a refund now" },
        executionPath: "human",
      }),
    );
    expect(decision.mode).toBe("draft");
  });

  it("assist mode never auto-sends", () => {
    const decision = service.evaluate(
      baseInput({ workspaceAutonomy: "assist" }),
    );
    expect(decision.mode).toBe("draft");
  });

  it("skips when owner is handling thread", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: {
          ...baseInput().ctx,
          conversation: { aiEnabled: false } as ConversationContext["conversation"],
        },
      }),
    );
    expect(decision.mode).toBe("skip");
    expect(decision.blockers).toContain("human_handling");
  });

  it("drafts when safety velocity rail triggers", () => {
    const decision = service.evaluate(
      baseInput({
        safetyBlocked: {
          code: "safety_velocity",
          reason: "Paused to prevent duplicate sends.",
        },
      }),
    );
    expect(decision.mode).toBe("draft");
    expect(decision.blockers).toContain("safety_velocity");
  });
});
