import { formatWhatsAppReply } from "./whatsapp-reply-format";

describe("formatWhatsAppReply", () => {
  it("converts markdown bold to WhatsApp bold", () => {
    expect(formatWhatsAppReply("Price is **₹999/mo**")).toBe("Price is *₹999/mo*");
  });

  it("strips corporate openers", () => {
    expect(
      formatWhatsAppReply(
        "Thank you for reaching out! Our plans start from ₹999.",
        { inboundText: "price?" },
      ),
    ).toBe("Our plans start from ₹999.");
  });

  it("removes markdown headers and normalizes list dashes", () => {
    expect(
      formatWhatsAppReply("### Plans\n- Starter ₹999\n- Growth ₹2999", {
        intentKind: "pricing",
        inboundText: "plans?",
      }),
    ).toBe("Plans\n• Starter ₹999\n• Growth ₹2999");
  });

  it("caps lines for very short inbound messages", () => {
    const long = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}`).join("\n");
    const result = formatWhatsAppReply(long, { inboundText: "hi" });
    expect(result.split("\n").length).toBeLessThanOrEqual(4);
  });

  it("allows more lines for detailed customer questions", () => {
    const lines = Array.from({ length: 9 }, (_, i) => `Point ${i + 1}`).join("\n");
    const result = formatWhatsAppReply(lines, {
      inboundText: "Can you explain all your plans features and payment options in detail?",
    });
    expect(result.split("\n").length).toBeLessThanOrEqual(10);
    expect(result.split("\n").length).toBeGreaterThanOrEqual(8);
  });

  it("strips formal closings on auto-send", () => {
    expect(
      formatWhatsAppReply("Sure, we can help.\n\nBest regards", { autoSend: true }),
    ).toBe("Sure, we can help.");
  });

  it("preserves intentional WhatsApp bold", () => {
    expect(formatWhatsAppReply("Timings: *10 AM – 8 PM*")).toBe("Timings: *10 AM – 8 PM*");
  });

  it("collapses excessive blank lines", () => {
    expect(formatWhatsAppReply("Hi\n\n\n\nHow can I help?")).toBe("Hi\n\nHow can I help?");
  });
});
