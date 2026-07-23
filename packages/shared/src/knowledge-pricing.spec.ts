import {
  corpusHasPricingSignals,
  normalizeInrPricingInContent,
} from "./knowledge-pricing";

describe("knowledge-pricing", () => {
  it("adds ₹ to bare plan prices", () => {
    const raw = "Solo Plan: 999\nTeam Plan: 2599";
    expect(normalizeInrPricingInContent(raw)).toBe("Solo Plan: ₹999\nTeam Plan: ₹2599");
  });

  it("does not double-prefix ₹", () => {
    expect(normalizeInrPricingInContent("Solo Plan: ₹999")).toBe("Solo Plan: ₹999");
  });

  it("detects bare plan prices as pricing signals", () => {
    expect(corpusHasPricingSignals("Solo Plan: 999 per month")).toBe(true);
    expect(corpusHasPricingSignals("We offer great support")).toBe(false);
  });
});
