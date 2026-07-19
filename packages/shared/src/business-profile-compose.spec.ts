import {
  buildCloseActionsBlock,
  buildVoiceInstructions,
  formatContactName,
  inferCustomerLanguage,
  isDiscountNegotiationMessage,
  resolveComposeLanguageInstruction,
  resolveProfileAcknowledgment,
} from "./business-profile-compose";
import { defaultBusinessEmployeeProfile } from "./intelligence";

describe("business-profile-compose", () => {
  const profile = defaultBusinessEmployeeProfile("Acme Shop");

  it("infers Hindi and Hinglish", () => {
    expect(inferCustomerLanguage("नमस्ते")).toBe("hi");
    expect(inferCustomerLanguage("Price kya hai?")).toBe("hinglish");
    expect(inferCustomerLanguage("What is the price?")).toBe("en");
  });

  it("builds voice instructions from profile", () => {
    const pro = defaultBusinessEmployeeProfile("Co");
    pro.voice.register = "professional";
    pro.voice.emoji = "none";
    const lines = buildVoiceInstructions(pro);
    expect(lines.join(" ")).toMatch(/professional/i);
    expect(lines.join(" ")).toMatch(/Do not use emojis/i);
  });

  it("mirrors customer language when enabled", () => {
    const p = defaultBusinessEmployeeProfile("Co");
    p.language.mirrorCustomer = true;
    expect(resolveComposeLanguageInstruction(p, "aapka rate kya hai")).toMatch(/Hinglish/i);
    p.language.mirrorCustomer = false;
    expect(resolveComposeLanguageInstruction(p, "aapka rate kya hai")).toMatch(/Hinglish/i);
  });

  it("formats first name when useFirstName is on", () => {
    expect(formatContactName(profile, "Priya Sharma")).toBe("Priya");
    const noFirst = defaultBusinessEmployeeProfile("Co");
    noFirst.voice.useFirstName = false;
    expect(formatContactName(noFirst, "Priya Sharma")).toBe("there");
  });

  it("includes close actions for ready_to_buy", () => {
    const p = defaultBusinessEmployeeProfile("Co");
    p.closeActions.paymentLink = "https://rzp.io/test";
    const block = buildCloseActionsBlock(p, "ready_to_buy");
    expect(block).toContain("https://rzp.io/test");
    expect(buildCloseActionsBlock(p, "greeting")).toBeUndefined();
  });

  it("resolves acknowledgment by blocker priority", () => {
    const p = defaultBusinessEmployeeProfile("Co");
    expect(resolveProfileAcknowledgment(p, ["knowledge_gap"])).toMatch(/checking/i);
    expect(resolveProfileAcknowledgment(p, ["sensitive_topic"])).toMatch(/reply shortly/i);
  });

  it("detects discount negotiation", () => {
    expect(isDiscountNegotiationMessage("Can you give 10% discount?")).toBe(true);
    expect(isDiscountNegotiationMessage("What is the price?")).toBe(false);
  });
});
