import { FastReplyService } from "./fast-reply.service";
import type { ConversationContext } from "./context-builder.service";
import { buildWorkingMemory, defaultBusinessEmployeeProfile } from "@growvisi/shared";

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

  const lead = {
    id: "lead",
    stage: "NEW" as const,
    score: 10,
    displayName: null,
    phone: "919999999999",
    profile: {},
    aiEnabled: true,
  };

  const base = {
    lead,
    conversation: { contactName: null },
    messages,
    observedMemory: [] as ConversationContext["observedMemory"],
  };

  return {
    organizationId: "org",
    conversationId: "conv",
    hasLeadRecord: true,
    leadId: "lead",
    lead,
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
    workingMemory: buildWorkingMemory(base),
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

  it("uses custom profile greeting and thanks templates", () => {
    const profile = defaultBusinessEmployeeProfile("Custom Shop");
    profile.greetingVariants.firstContact = ["Namaste! Custom Shop here — bataiye?"];
    profile.greetingVariants.returning = ["Welcome back to Custom Shop!"];
    profile.courtesyTemplates.thanks = ["Dhanyavaad — we're here if you need more help."];

    expect(fast.compose("Hi", "Custom Shop", ctx("Hi", false), profile)).toBe(
      "Namaste! Custom Shop here — bataiye?",
    );
    expect(fast.compose("Hello", "Custom Shop", ctx("Hello", true), profile)).toBe(
      "Welcome back to Custom Shop!",
    );
    expect(fast.compose("Thanks", "Custom Shop", ctx("Thanks", true), profile)).toBe(
      "Dhanyavaad — we're here if you need more help.",
    );
  });
});
