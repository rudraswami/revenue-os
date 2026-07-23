import { validateComposedReplyForSend } from "./reply-trust-rails";

describe("validateComposedReplyForSend", () => {
  it("allows fast-path template replies", () => {
    expect(
      validateComposedReplyForSend({
        text: "Hi! Thanks for messaging us.",
        sources: [],
        isFastPath: true,
        intentKind: "greeting",
      }).allowed,
    ).toBe(true);
  });

  it("blocks invented pricing without sources", () => {
    const result = validateComposedReplyForSend({
      text: "Our Growth plan is ₹2,999 per month.",
      sources: [],
      isFastPath: false,
      intentKind: "pricing",
    });
    expect(result.allowed).toBe(false);
    expect(result.blocker).toBe("compose_grounding");
  });

  it("allows grounded pricing reply", () => {
    expect(
      validateComposedReplyForSend({
        text: "Growth is ₹2,999/mo per our pricing doc.",
        sources: [{ similarity: 0.82 }],
        isFastPath: false,
        intentKind: "pricing",
        minGroundingSimilarity: 0.7,
      }).allowed,
    ).toBe(true);
  });

  it("allows grounded pricing even at lower similarity (fact-based, not threshold-based)", () => {
    expect(
      validateComposedReplyForSend({
        text: "Our Starter plan is ₹999/mo.",
        sources: [{ similarity: 0.42 }],
        isFastPath: false,
        intentKind: "pricing",
        minGroundingSimilarity: 0.7,
      }).allowed,
    ).toBe(true);
  });

  it("allows pricing-intent reply that mentions cost without a concrete price", () => {
    expect(
      validateComposedReplyForSend({
        text: "Great question — I'll confirm the exact cost for your setup and message you back.",
        sources: [],
        isFastPath: false,
        intentKind: "pricing",
      }).allowed,
    ).toBe(true);
  });

  it("blocks only concrete rupee amounts without sources", () => {
    const result = validateComposedReplyForSend({
      text: "The cost depends on your requirements.",
      sources: [],
      isFastPath: false,
      intentKind: "pricing",
    });
    expect(result.allowed).toBe(true);
  });

  it("allows courtesy LLM replies without KB", () => {
    expect(
      validateComposedReplyForSend({
        text: "Hello! How can we help?",
        sources: [],
        isFastPath: false,
        intentKind: "greeting",
      }).allowed,
    ).toBe(true);
  });
});
