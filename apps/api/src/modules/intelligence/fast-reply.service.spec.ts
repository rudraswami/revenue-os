import { FastReplyService } from "./fast-reply.service";
import type { ConversationContext } from "./context-builder.service";

function ctx(
  lastInbound: string,
  hasOutbound: boolean,
): ConversationContext {
  const messages = hasOutbound
    ? [
        {
          id: "1",
          direction: "OUTBOUND",
          content: "Hi earlier",
          sentByAi: true,
          createdAt: new Date(),
        },
      ]
    : [];

  return {
    organizationId: "org",
    conversationId: "conv",
    leadId: "lead",
    lead: {
      id: "lead",
      stage: "NEW",
      score: 10,
      displayName: null,
      phone: "919999999999",
      profile: {},
      aiEnabled: true,
    },
    conversation: {
      id: "conv",
      aiEnabled: true,
      metadata: {},
      contactName: null,
      lastInboundAt: new Date(),
    },
    messages,
    transcript: "",
    lastInbound,
    ragQuery: lastInbound,
    observedMemory: [],
  };
}

describe("FastReplyService", () => {
  const fast = new FastReplyService();

  it("composes first-contact greeting with business name", () => {
    const reply = fast.compose("Hi", "Petals Florist", ctx("Hi", false));
    expect(reply).toContain("Petals Florist");
    expect(reply).not.toMatch(/hello again/i);
  });

  it("composes shorter returning greeting without welcome again", () => {
    const reply = fast.compose("Hello", "Petals Florist", ctx("Hello", true));
    expect(reply).toBeTruthy();
    expect(reply).not.toMatch(/welcome to/i);
    expect(reply).not.toMatch(/hello again/i);
  });

  it("composes thanks reply", () => {
    const reply = fast.compose("Thanks", "Petals Florist", ctx("Thanks", true));
    expect(reply).toMatch(/welcome|happy|anytime/i);
  });
});
