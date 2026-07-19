import {
  buildWorkingMemory,
  detectContradictionFlags,
  extractLastQuotedAmount,
  resolveEngagementPhase,
  type BuildWorkingMemoryInput,
} from "./working-memory";

const baseInput: BuildWorkingMemoryInput = {
  lead: {
    stage: "NEW",
    score: 10,
    displayName: "Priya",
    phone: "919876543210",
    profile: {
      lastIntent: "Pricing inquiry",
      summary: "Asked about modular kitchen",
      nextAction: "Send rate card",
      aiTags: ["price-sensitive"],
      classificationLanguage: "hinglish",
    },
  },
  conversation: { contactName: "Priya Sharma" },
  messages: [],
  observedMemory: [],
};

describe("working-memory", () => {
  it("first_contact when no outbound messages", () => {
    const wm = buildWorkingMemory({
      ...baseInput,
      messages: [{ direction: "INBOUND", content: "Hi" }],
    });
    expect(wm.engagementPhase).toBe("first_contact");
    expect(wm.threadAlreadyEngaged).toBe(false);
  });

  it("returning after business replied", () => {
    const wm = buildWorkingMemory({
      ...baseInput,
      messages: [
        { direction: "INBOUND", content: "Hi" },
        { direction: "OUTBOUND", content: "Hello! How can we help?" },
        { direction: "INBOUND", content: "Price?" },
      ],
    });
    expect(wm.engagementPhase).toBe("returning");
    expect(wm.threadAlreadyEngaged).toBe(true);
  });

  it("active_deal for qualified stage", () => {
    expect(
      resolveEngagementPhase({
        ...baseInput,
        lead: { ...baseInput.lead, stage: "QUALIFIED", score: 55 },
        messages: [{ direction: "OUTBOUND", content: "Quote sent" }],
      }),
    ).toBe("active_deal");
  });

  it("extracts last quoted amount from outbound", () => {
    const amount = extractLastQuotedAmount(
      [
        { direction: "OUTBOUND", content: "Our package is ₹45,000 all inclusive" },
        { direction: "INBOUND", content: "Ok" },
      ],
      [],
    );
    expect(amount).toBe("₹45000");
  });

  it("detects customer dispute of last reply", () => {
    const flags = detectContradictionFlags([
      { direction: "OUTBOUND", content: "Price is ₹50,000" },
      { direction: "INBOUND", content: "That's wrong, you said 45k earlier" },
    ]);
    expect(flags).toContain("customer_disputed_last_reply");
  });

  it("builds customer card from profile and memory", () => {
    const wm = buildWorkingMemory({
      ...baseInput,
      observedMemory: [
        { type: "fact", content: "Language: hi", source: "ai" },
        { type: "summary", content: "Wants 3BHK quote", source: "ai" },
      ],
      messages: [{ direction: "INBOUND", content: "Namaste" }],
    });
    expect(wm.customerCard.displayName).toBe("Priya Sharma");
    expect(wm.customerCard.language).toBe("hi");
    expect(wm.customerCard.lastSummary).toBe("Wants 3BHK quote");
    expect(wm.customerCard.tags).toContain("price-sensitive");
  });

  it("prefers human-corrected memory over AI facts", () => {
    const wm = buildWorkingMemory({
      ...baseInput,
      observedMemory: [
        { type: "fact", content: "Intent: Pricing inquiry", source: "ai" },
        { type: "fact", content: "Intent (corrected): Site visit booking", source: "human" },
        { type: "fact", content: "Language: hinglish", source: "ai" },
        { type: "fact", content: "Language: hi", source: "human" },
      ],
      messages: [{ direction: "OUTBOUND", content: "Hello" }],
    });
    expect(wm.customerCard.lastIntent).toBe("Site visit booking");
    expect(wm.customerCard.language).toBe("hi");
    expect(wm.openCommitments).toContain("Site visit booking");
  });

  it("retains quote from earlier outbound in long thread", () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      direction: i % 2 === 0 ? "INBOUND" : "OUTBOUND",
      content:
        i === 3
          ? "Package starts at ₹1,25,000 for 2BHK"
          : i % 2 === 0
            ? "Follow-up question"
            : "Sure, noted.",
    }));
    const wm = buildWorkingMemory({ ...baseInput, messages });
    expect(wm.lastQuotedAmount).toBe("₹125000");
  });
});
