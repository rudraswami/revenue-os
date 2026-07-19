import {
  assessCommercialSensitivity,
  isCommercialIntentKind,
  shouldApplyDealStageGate,
} from "./commercial-sensitivity";

describe("commercial-sensitivity", () => {
  it("post_sale courtesy stays low sensitivity", () => {
    expect(
      assessCommercialSensitivity({
        relationshipPhase: "post_sale",
        stage: "WON",
        intentKind: "greeting",
        lastInbound: "Hi",
      }),
    ).toBe("low");
  });

  it("post_sale pricing is high sensitivity", () => {
    expect(
      assessCommercialSensitivity({
        relationshipPhase: "post_sale",
        stage: "WON",
        intentKind: "pricing",
        lastInbound: "Any new offers?",
      }),
    ).toBe("high");
  });

  it("win_back commercial is medium", () => {
    expect(
      assessCommercialSensitivity({
        relationshipPhase: "win_back",
        stage: "LOST",
        intentKind: "pricing",
        lastInbound: "What is the price now?",
      }),
    ).toBe("medium");
  });

  it("negotiation stage raises sensitivity only for commercial messages", () => {
    expect(
      assessCommercialSensitivity({
        relationshipPhase: "active_deal",
        stage: "NEGOTIATION",
        intentKind: "follow_up",
        lastInbound: "Any update?",
      }),
    ).toBe("low");
    expect(
      assessCommercialSensitivity({
        relationshipPhase: "active_deal",
        stage: "NEGOTIATION",
        intentKind: "pricing",
        lastInbound: "Final price?",
      }),
    ).toBe("high");
  });

  it("deal stage gate skips courtesy", () => {
    expect(
      shouldApplyDealStageGate({
        stage: "NEGOTIATION",
        humanForStages: ["NEGOTIATION", "PROPOSAL"],
        commercialSensitivity: "high",
        intentKind: "greeting",
        isCourtesy: true,
      }),
    ).toBe(false);
  });

  it("deal stage gate skips low-sensitivity FAQ at proposal", () => {
    expect(
      shouldApplyDealStageGate({
        stage: "PROPOSAL",
        humanForStages: ["NEGOTIATION", "PROPOSAL"],
        commercialSensitivity: "low",
        intentKind: "general",
        isCourtesy: false,
      }),
    ).toBe(false);
  });

  it("deal stage gate applies for commercial at negotiation", () => {
    expect(
      shouldApplyDealStageGate({
        stage: "NEGOTIATION",
        humanForStages: ["NEGOTIATION", "PROPOSAL"],
        commercialSensitivity: "high",
        intentKind: "pricing",
        isCourtesy: false,
      }),
    ).toBe(true);
  });

  it("detects commercial intent kinds", () => {
    expect(isCommercialIntentKind("pricing")).toBe(true);
    expect(isCommercialIntentKind("greeting")).toBe(false);
  });
});
