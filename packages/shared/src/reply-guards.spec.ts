import {
  hasSubstantiveQuestion,
  isCourtesyOnlyMessage,
  isSimpleAck,
  isSimpleGreeting,
  isSimpleThanks,
} from "./reply-guards";

describe("reply guards", () => {
  it("detects greetings", () => {
    expect(isSimpleGreeting("Hi")).toBe(true);
    expect(isSimpleGreeting("Hello!")).toBe(true);
  });

  it("detects thanks", () => {
    expect(isSimpleThanks("Thanks")).toBe(true);
    expect(isSimpleThanks("Thank you")).toBe(true);
  });

  it("detects short positive acknowledgements", () => {
    for (const msg of ["Great", "great!", "Nice", "Cool", "Awesome", "Perfect", "Sounds good"]) {
      expect(isSimpleAck(msg)).toBe(true);
    }
  });

  it("does not treat questions as acks", () => {
    expect(isSimpleAck("What is your pricing?")).toBe(false);
    expect(isSimpleAck("Great, what plans do you have?")).toBe(false);
  });

  it("detects substantive questions in mixed messages", () => {
    expect(hasSubstantiveQuestion("Hi, what is the price?")).toBe(true);
    expect(hasSubstantiveQuestion("Namaste")).toBe(false);
  });

  it("blocks courtesy fast-path when a question is embedded", () => {
    expect(isCourtesyOnlyMessage("Hi, do you deliver to Pune?")).toBe(false);
    expect(isCourtesyOnlyMessage("Thanks!")).toBe(true);
  });
});
