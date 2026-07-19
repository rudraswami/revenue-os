import { ExecutionRouterService } from "./execution-router.service";
import { FastReplyService } from "./fast-reply.service";
import type { ConversationContext } from "./context-builder.service";
import { buildWorkingMemory } from "@growvisi/shared";

function ctx(lastInbound: string, outbound = false): ConversationContext {
  const messages = outbound
    ? [
        {
          id: "1",
          direction: "INBOUND",
          content: "Hi",
          sentByAi: false,
          createdAt: new Date(),
        },
        {
          id: "2",
          direction: "OUTBOUND",
          content: "Hello!",
          sentByAi: true,
          createdAt: new Date(),
        },
      ]
    : [];

  const lead = {
    id: "lead",
    stage: "NEW" as const,
    score: 10,
    displayName: "Ravi",
    phone: "919999999999",
    profile: {},
    aiEnabled: true,
  };

  const base = {
    lead,
    conversation: { contactName: "Ravi" },
    messages,
    observedMemory: [] as ConversationContext["observedMemory"],
  };

  return {
    organizationId: "org",
    conversationId: "conv",
    leadId: "lead",
    lead,
    conversation: {
      id: "conv",
      aiEnabled: true,
      metadata: {},
      contactName: "Ravi",
      lastInboundAt: new Date(),
    },
    messages,
    transcript: `Customer: ${lastInbound}`,
    lastInbound,
    ragQuery: lastInbound,
    observedMemory: [],
    workingMemory: buildWorkingMemory(base),
  };
}

describe("ExecutionRouterService", () => {
  const router = new ExecutionRouterService(new FastReplyService());

  it("routes Hi to fast path", () => {
    const route = router.routePreClassify(ctx("Hi"));
    expect(route.path).toBe("fast");
    expect(route.intentKind).toBe("greeting");
  });

  it("routes Thanks to fast path", () => {
    const route = router.routePreClassify(ctx("Thanks"));
    expect(route.path).toBe("fast");
    expect(route.intentKind).toBe("thanks");
  });

  it("routes pricing to standard path", () => {
    const route = router.routePreClassify(ctx("What is your pricing?"));
    expect(route.path).toBe("standard");
    expect(route.intentKind).toBe("pricing");
  });

  it("routes refund request to human path", () => {
    const route = router.routePreClassify(ctx("I want a refund"));
    expect(route.path).toBe("human");
  });

  it("upgrades to human when classification requires human", () => {
    const pre = router.routePreClassify(ctx("What packages do you offer?"));
    const refined = router.refineAfterClassify(pre, {
      stage: "QUALIFIED",
      confidence: 0.8,
      intent: "Pricing inquiry",
      sentiment: "neutral",
      suggestedActions: [],
      requiresHuman: true,
    }, ctx("What packages do you offer?"));
    expect(refined.path).toBe("human");
  });
});
