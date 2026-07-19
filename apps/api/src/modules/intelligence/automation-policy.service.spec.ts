import { AutomationPolicyService } from "./automation-policy.service";
import type { ConversationContext } from "./context-builder.service";
import { DEFAULT_INTELLIGENCE_SETTINGS } from "@growvisi/shared";

function baseCtx(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    conversationId: "c1",
    leadId: "l1",
    lastInbound: "Hi",
    ragQuery: "Hi",
    transcript: "Customer: Hi",
    conversation: { aiEnabled: true },
    lead: { stage: "NEW", score: 10, displayName: "Test", phone: "91" },
    observedMemory: [],
    ...overrides,
  } as ConversationContext;
}

describe("AutomationPolicyService", () => {
  const service = new AutomationPolicyService();

  it("sends greetings on balanced preset", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx(),
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
      executionPath: "fast",
      humanHandling: false,
    });
    expect(result.outcome).toBe("send");
  });

  it("drafts pricing without knowledge on balanced", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({ lastInbound: "What is your pricing for 10 users?" }),
      classification: {
        stage: "QUALIFIED",
        confidence: 0.8,
        intent: "Pricing",
        sentiment: "neutral",
        suggestedActions: [],
        requiresHuman: false,
      },
      knowledgeHits: [],
      knowledgeGap: true,
      executionPath: "standard",
      humanHandling: false,
    });
    expect(result.outcome).toBe("draft");
    expect(result.blockers).toContain("knowledge_gap");
  });

  it("human for sensitive inbound", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({ lastInbound: "I want a refund" }),
      classification: {
        stage: "NEGOTIATION",
        confidence: 0.9,
        intent: "Complaint",
        sentiment: "negative",
        suggestedActions: [],
        requiresHuman: false,
      },
      knowledgeHits: [],
      knowledgeGap: false,
      executionPath: "human",
      humanHandling: false,
    });
    expect(result.outcome).toBe("human");
  });

  it("drafts negotiation stage on balanced", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({
        lastInbound: "Can you do 20% discount?",
        lead: {
          id: "l1",
          stage: "NEGOTIATION",
          score: 80,
          displayName: "Test",
          phone: "91",
          profile: {},
          aiEnabled: true,
        },
      }),
      classification: {
        stage: "NEGOTIATION",
        confidence: 0.75,
        intent: "Negotiation",
        sentiment: "neutral",
        suggestedActions: [],
        requiresHuman: false,
      },
      knowledgeHits: [],
      knowledgeGap: false,
      executionPath: "complex",
      humanHandling: false,
    });
    expect(result.outcome).toBe("draft");
  });

  it("blocks when owner is handling thread", () => {
    const result = service.evaluate({
      settings: DEFAULT_INTELLIGENCE_SETTINGS,
      ctx: baseCtx(),
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
      executionPath: "fast",
      humanHandling: true,
    });
    expect(result.outcome).toBe("human");
    expect(result.blockers).toContain("human_handling");
  });
});
