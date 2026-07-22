import { ReplyPolicyService, type ReplyPolicyInput } from "./reply-policy.service";
import { AutomationPolicyService } from "./automation-policy.service";
import type { ConversationContext } from "./context-builder.service";
import { DEFAULT_INTELLIGENCE_SETTINGS, buildWorkingMemory } from "@growvisi/shared";

function baseInput(overrides: Partial<ReplyPolicyInput> = {}): ReplyPolicyInput {
  const lead = { stage: "NEW" as const, profile: {} };
  const messages = [{ direction: "INBOUND", content: "Hi" }];
  const ctx = {
    conversation: { aiEnabled: true },
    lead,
    lastInbound: "Hi",
    workingMemory: buildWorkingMemory({
      lead: {
        stage: lead.stage,
        score: 10,
        displayName: null,
        phone: "91",
        profile: lead.profile,
      },
      conversation: { contactName: null },
      messages,
      observedMemory: [],
    }),
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

  it("drafts when customer explicitly asks for a human (hard signal)", () => {
    const decision = service.evaluate(
      baseInput({
        ctx: {
          ...baseInput().ctx,
          lastInbound: "I want to speak to a manager please",
        },
        classification: {
          ...baseInput().classification,
          requiresHuman: true,
        },
        executionPath: "human",
      }),
    );
    expect(decision.mode).toBe("draft");
  });

  it("advisory requiresHuman without a hard signal does not block a courtesy send", () => {
    const decision = service.evaluate(
      baseInput({
        classification: {
          ...baseInput().classification,
          requiresHuman: true,
        },
        executionPath: "human",
      }),
    );
    expect(decision.mode).toBe("send");
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

  it("does not skip WON stage — courtesy can auto-send", () => {
    const lead = { stage: "WON" as const, profile: {} };
    const messages = [{ direction: "INBOUND", content: "Hi" }];
    const decision = service.evaluate(
      baseInput({
        ctx: {
          conversation: { aiEnabled: true },
          lead,
          lastInbound: "Hi",
          workingMemory: buildWorkingMemory({
            lead: {
              stage: "WON",
              score: 100,
              displayName: null,
              phone: "91",
              profile: {},
            },
            conversation: { contactName: null },
            messages,
            observedMemory: [],
          }),
        } as ConversationContext,
      }),
    );
    expect(decision.mode).toBe("send");
    expect(decision.blockers ?? []).not.toContain("terminal_stage");
  });
});
