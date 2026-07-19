import { ReplyTrustRailsService } from "./reply-trust-rails.service";

describe("ReplyTrustRailsService", () => {
  const service = new ReplyTrustRailsService();

  it("blocks ungrounded pricing at compose time", () => {
    const result = service.validatePostCompose({
      text: "Starter is ₹999/month.",
      sources: [],
      isFastPath: false,
      intentKind: "pricing",
      automationPreset: "balanced",
    });
    expect(result.allowed).toBe(false);
    expect(result.blocker).toBe("compose_grounding");
  });
});
