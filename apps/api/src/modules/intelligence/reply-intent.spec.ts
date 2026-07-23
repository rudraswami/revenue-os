import {
  assessReplyRisk,
  buildRagQuery,
  isPricingInbound,
  isSensitiveInbound,
  playbookForIntent,
  resolveReplyIntentKind,
} from "./reply-intent";

describe("reply-intent", () => {
  it("detects test check-in messages", () => {
    expect(resolveReplyIntentKind("Hello test", null)).toBe("test_checkin");
    expect(resolveReplyIntentKind("Testing", null)).toBe("test_checkin");
  });

  it("detects greeting vs pricing from latest message", () => {
    expect(resolveReplyIntentKind("Hi", { intent: "Pricing inquiry", stage: "NEGOTIATION" } as never)).toBe(
      "greeting",
    );
    expect(
      resolveReplyIntentKind("What is the price for 5 users?", {
        intent: "Pricing inquiry",
        stage: "NEW",
      } as never),
    ).toBe("pricing");
  });

  it("builds RAG query from message and intent", () => {
    expect(buildRagQuery("Hello", { intent: "Greeting", summary: "New lead" })).toContain("Hello");
    expect(buildRagQuery("Hello", { intent: "Greeting", summary: "New lead" })).toContain("Greeting");
  });

  it("prefers replyBrief for RAG query when present", () => {
    const q = buildRagQuery("price and delivery?", {
      intent: "Pricing",
      replyBrief: "Answer modular kitchen price and delivery timeline",
      customerNeeds: ["Price", "Delivery"],
    });
    expect(q).toContain("modular kitchen");
  });

  it("returns playbook per intent kind", () => {
    expect(playbookForIntent("greeting")).toMatch(/Greeting/i);
    expect(playbookForIntent("pricing")).toMatch(/pricing/i);
  });

  it("detects sensitive and pricing inbound messages", () => {
    expect(isSensitiveInbound("I want a refund")).toBe(true);
    expect(isSensitiveInbound("speak to a manager")).toBe(true);
    expect(isSensitiveInbound("What is the price?")).toBe(false);
    expect(isPricingInbound("What is the price for 5 users?")).toBe(true);
    expect(isPricingInbound("kitna cost hai?")).toBe(true);
    expect(isPricingInbound("what is the prise?")).toBe(true);
    expect(isPricingInbound("Hello")).toBe(false);
  });

  it("assesses reply risk consistently", () => {
    expect(
      assessReplyRisk({
        lastInbound: "refund please",
        requiresHuman: false,
        knowledgeGap: false,
        knowledgeHitCount: 2,
      }),
    ).toBe("high");
    expect(
      assessReplyRisk({
        lastInbound: "price?",
        knowledgeGap: true,
        knowledgeHitCount: 0,
      }),
    ).toBe("medium");
    expect(
      assessReplyRisk({
        lastInbound: "hello",
        knowledgeGap: false,
        knowledgeHitCount: 1,
      }),
    ).toBe("low");
  });

  describe("new SMB intents", () => {
    it("detects availability_check in English", () => {
      expect(resolveReplyIntentKind("Is this product available?", null)).toBe("availability_check");
      expect(resolveReplyIntentKind("Do you have this in stock?", null)).toBe("availability_check");
    });

    it("detects availability_check in Hinglish", () => {
      expect(resolveReplyIntentKind("Ye available hai?", null)).toBe("availability_check");
      expect(resolveReplyIntentKind("Ye milega kya?", null)).toBe("availability_check");
    });

    it("detects hours_location in English", () => {
      expect(resolveReplyIntentKind("Where is your shop?", null)).toBe("hours_location");
      expect(resolveReplyIntentKind("What are your office hours?", null)).toBe("hours_location");
    });

    it("detects hours_location in Hinglish", () => {
      expect(resolveReplyIntentKind("Kahan hai aapka store?", null)).toBe("hours_location");
      expect(resolveReplyIntentKind("Address batao", null)).toBe("hours_location");
    });

    it("detects booking_request in English", () => {
      expect(resolveReplyIntentKind("I want to book for tomorrow", null)).toBe("booking_request");
      expect(resolveReplyIntentKind("Can I schedule an appointment?", null)).toBe("booking_request");
    });

    it("detects booking_request in Hinglish", () => {
      expect(resolveReplyIntentKind("Kal ka slot book karna hai", null)).toBe("booking_request");
      expect(resolveReplyIntentKind("Parso ka appointment mil jayega?", null)).toBe("booking_request");
    });

    it("detects payment_method in English", () => {
      expect(resolveReplyIntentKind("Do you accept UPI?", null)).toBe("payment_method");
      expect(resolveReplyIntentKind("Can I pay by card?", null)).toBe("payment_method");
    });

    it("detects payment_method in Hinglish", () => {
      expect(resolveReplyIntentKind("UPI se payment ho jayega?", null)).toBe("payment_method");
      expect(resolveReplyIntentKind("GPay chalega kya?", null)).toBe("payment_method");
    });

    it("detects product_info in English", () => {
      expect(resolveReplyIntentKind("What services do you offer?", null)).toBe("product_info");
      expect(resolveReplyIntentKind("Tell me about your products", null)).toBe("product_info");
    });

    it("detects product_info in Hinglish", () => {
      expect(resolveReplyIntentKind("Kya kya milega?", null)).toBe("product_info");
      expect(resolveReplyIntentKind("Catalog dikhao", null)).toBe("product_info");
    });

    it("returns playbooks for new intents", () => {
      expect(playbookForIntent("availability_check")).toMatch(/Availability/i);
      expect(playbookForIntent("hours_location")).toMatch(/Hours/i);
      expect(playbookForIntent("booking_request")).toMatch(/Booking/i);
      expect(playbookForIntent("payment_method")).toMatch(/Payment/i);
      expect(playbookForIntent("product_info")).toMatch(/Product/i);
    });

    it("still falls back to general for unrecognized messages", () => {
      expect(resolveReplyIntentKind("Random gibberish xyz", null)).toBe("general");
    });

    it("existing intents take priority over new ones", () => {
      expect(resolveReplyIntentKind("What is the price of this product?", null)).toBe("pricing");
      expect(resolveReplyIntentKind("I want a refund for this product", null)).toBe("complaint");
    });

    it("does not treat NEGOTIATION deal stage alone as discount negotiation", () => {
      expect(
        resolveReplyIntentKind("What are the plans available?", {
          intent: "Product inquiry",
          stage: "NEGOTIATION",
        } as never),
      ).toBe("pricing");
      expect(
        resolveReplyIntentKind("Can you give 15% discount?", {
          intent: "Negotiation",
          stage: "NEGOTIATION",
        } as never),
      ).toBe("negotiation");
    });
  });
});
