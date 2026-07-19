import { AutomationPolicyService } from "./automation-policy.service";
import type { ConversationContext } from "./context-builder.service";
import { DEFAULT_INTELLIGENCE_SETTINGS, buildWorkingMemory, defaultBusinessEmployeeProfile } from "@growvisi/shared";

function baseCtx(overrides: Partial<ConversationContext> = {}): ConversationContext {
  const lead = {
    id: "l1",
    stage: "NEW" as const,
    score: 10,
    displayName: "Test",
    phone: "91",
    profile: {},
    aiEnabled: true,
  };
  const messages =
    overrides.messages ??
    ([
      {
        id: "m1",
        direction: "INBOUND",
        content: "Hi",
        sentByAi: false,
        createdAt: new Date(),
      },
    ] as ConversationContext["messages"]);
  const observedMemory = overrides.observedMemory ?? [];
  const base = {
    conversationId: "c1",
    leadId: "l1",
    lastInbound: "Hi",
    ragQuery: "Hi",
    transcript: "Customer: Hi",
    conversation: { aiEnabled: true, id: "c1", metadata: {}, contactName: null, lastInboundAt: null },
    lead,
    observedMemory,
    messages,
    organizationId: "org1",
    workingMemory: buildWorkingMemory({
      lead,
      conversation: { contactName: null },
      messages,
      observedMemory,
    }),
  };
  return {
    ...base,
    ...overrides,
    workingMemory:
      overrides.workingMemory ??
      buildWorkingMemory({
        lead: overrides.lead ?? lead,
        conversation: { contactName: overrides.conversation?.contactName ?? null },
        messages,
        observedMemory,
      }),
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

  it("sends greetings in NEGOTIATION stage (courtesy bypasses deal stage)", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({
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
    expect(result.blockers).not.toContain("deal_stage");
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
    expect(result.acknowledgment).toBeUndefined();
  });

  it("returns acknowledgment for sensitive inbound", () => {
    const result = service.evaluate({
      settings: DEFAULT_INTELLIGENCE_SETTINGS,
      ctx: baseCtx({ lastInbound: "I want a refund now" }),
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
    expect(result.acknowledgment).toBeTruthy();
  });

  it("drafts discount negotiation when authority is none", () => {
    const result = service.evaluate({
      settings: {
        ...DEFAULT_INTELLIGENCE_SETTINGS,
        replyAutonomy: "auto_guarded",
        businessProfile: defaultBusinessEmployeeProfile("Shop"),
      },
      ctx: baseCtx({ lastInbound: "Can you give 15% discount?" }),
      classification: {
        stage: "NEGOTIATION",
        confidence: 0.85,
        intent: "Negotiation",
        sentiment: "neutral",
        suggestedActions: [],
        requiresHuman: false,
      },
      knowledgeHits: [
        {
          chunkId: "c1",
          documentId: "d1",
          category: "pricing",
          title: "Pricing",
          content: "Starter ₹999",
          similarity: 0.9,
          citation: "Pricing",
        },
      ],
      knowledgeGap: false,
      executionPath: "standard",
      humanHandling: false,
    });
    expect(result.outcome).toBe("draft");
    expect(result.blockers).toContain("discount_authority");
  });

  it("human for requiresOwner judgment", () => {
    const result = service.evaluate({
      settings: DEFAULT_INTELLIGENCE_SETTINGS,
      ctx: baseCtx({ lastInbound: "I need to speak to the owner about bulk pricing" }),
      classification: {
        stage: "PROPOSAL",
        confidence: 0.85,
        intent: "Enterprise pricing",
        sentiment: "neutral",
        suggestedActions: [],
        requiresHuman: false,
        requiresOwner: true,
      },
      knowledgeHits: [],
      knowledgeGap: false,
      executionPath: "standard",
      humanHandling: false,
    });
    expect(result.outcome).toBe("human");
    expect(result.blockers).toContain("needs_owner");
  });

  it("drafts when apology is required", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({ lastInbound: "Very disappointed with the service" }),
      classification: {
        stage: "NEGOTIATION",
        confidence: 0.8,
        intent: "Complaint",
        sentiment: "negative",
        suggestedActions: [],
        requiresHuman: false,
        apologyRequired: true,
      },
      knowledgeHits: [],
      knowledgeGap: false,
      executionPath: "standard",
      humanHandling: false,
    });
    expect(result.outcome).toBe("draft");
    expect(result.blockers).toContain("apology_required");
  });

  it("sends greetings on WON stage (post-sale courtesy)", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({
        lead: {
          id: "l1",
          stage: "WON",
          score: 100,
          displayName: "Test",
          phone: "91",
          profile: {},
          aiEnabled: true,
        },
      }),
      classification: {
        stage: "WON",
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
    expect(result.blockers).not.toContain("terminal_stage");
  });

  it("drafts commercial messages on WON stage", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({
        lastInbound: "Any discount on renewal?",
        lead: {
          id: "l1",
          stage: "WON",
          score: 100,
          displayName: "Test",
          phone: "91",
          profile: {},
          aiEnabled: true,
        },
      }),
      classification: {
        stage: "WON",
        confidence: 0.85,
        intent: "Pricing",
        sentiment: "neutral",
        suggestedActions: [],
        requiresHuman: false,
      },
      knowledgeHits: [
        {
          chunkId: "c1",
          documentId: "d1",
          category: "pricing",
          title: "Pricing",
          content: "Growth ₹2999",
          similarity: 0.9,
          citation: "Pricing",
        },
      ],
      knowledgeGap: false,
      executionPath: "standard",
      humanHandling: false,
    });
    expect(result.outcome).toBe("draft");
    expect(result.blockers).toContain("post_sale_commercial");
  });

  it("sends grounded FAQ at PROPOSAL when not commercially sensitive", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({
        lastInbound: "What are your office hours?",
        lead: {
          id: "l1",
          stage: "PROPOSAL",
          score: 70,
          displayName: "Test",
          phone: "91",
          profile: {},
          aiEnabled: true,
        },
      }),
      classification: {
        stage: "PROPOSAL",
        confidence: 0.85,
        intent: "General inquiry",
        sentiment: "neutral",
        suggestedActions: [],
        requiresHuman: false,
      },
      knowledgeHits: [
        {
          chunkId: "c1",
          documentId: "d1",
          category: "faq",
          title: "Hours",
          content: "Mon-Sat 10am-7pm",
          similarity: 0.88,
          citation: "Hours",
        },
      ],
      knowledgeGap: false,
      executionPath: "standard",
      humanHandling: false,
    });
    expect(result.outcome).toBe("send");
    expect(result.blockers).not.toContain("deal_stage");
  });

  it("drafts FAQ when Business Knowledge is not indexed", () => {
    const result = service.evaluate({
      settings: { ...DEFAULT_INTELLIGENCE_SETTINGS, replyAutonomy: "auto_guarded" },
      ctx: baseCtx({ lastInbound: "What are your office hours?" }),
      classification: {
        stage: "NEW",
        confidence: 0.85,
        intent: "General inquiry",
        sentiment: "neutral",
        suggestedActions: [],
        requiresHuman: false,
      },
      knowledgeHits: [],
      knowledgeGap: false,
      executionPath: "standard",
      humanHandling: false,
      hasIndexedChunks: false,
    });
    expect(result.outcome).toBe("draft");
    expect(result.blockers).toContain("kb_not_indexed");
  });
});
