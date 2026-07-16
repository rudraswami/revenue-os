import {
  activationAllComplete,
  activationNextMilestone,
  computeGoLiveProgressPct,
  deriveAgencyConnectionStatus,
} from "./whatsapp-go-live";

describe("computeGoLiveProgressPct", () => {
  it("returns 0 when disconnected with no steps done", () => {
    expect(computeGoLiveProgressPct([false, false, false, false, false], false)).toBe(0);
  });

  it("counts connected as one completed step", () => {
    expect(computeGoLiveProgressPct([false, false, false, false, false], true)).toBe(17);
  });

  it("returns 100 when connected and all steps done", () => {
    expect(computeGoLiveProgressPct([true, true, true, true, true], true)).toBe(100);
  });
});

describe("deriveAgencyConnectionStatus", () => {
  it("returns disconnected when not connected", () => {
    expect(
      deriveAgencyConnectionStatus({
        connected: false,
        tokenNeedsRefresh: false,
        goLiveProgressPct: 0,
        firstMessage: false,
        classified: false,
      }),
    ).toBe("disconnected");
  });

  it("returns token when refresh needed", () => {
    expect(
      deriveAgencyConnectionStatus({
        connected: true,
        tokenNeedsRefresh: true,
        goLiveProgressPct: 100,
        firstMessage: true,
        classified: true,
      }),
    ).toBe("token");
  });

  it("returns live when healthy and classified", () => {
    expect(
      deriveAgencyConnectionStatus({
        connected: true,
        tokenNeedsRefresh: false,
        goLiveProgressPct: 90,
        firstMessage: true,
        classified: true,
      }),
    ).toBe("live");
  });

  it("returns setup when connected but not live yet", () => {
    expect(
      deriveAgencyConnectionStatus({
        connected: true,
        tokenNeedsRefresh: false,
        goLiveProgressPct: 50,
        firstMessage: false,
        classified: false,
      }),
    ).toBe("setup");
  });
});

describe("activationAllComplete", () => {
  it("requires all four activation milestones", () => {
    expect(
      activationAllComplete({
        whatsappConnected: true,
        firstInbound: true,
        aiClassified: true,
        pipelineMoved: false,
      }),
    ).toBe(false);
    expect(
      activationAllComplete({
        whatsappConnected: true,
        firstInbound: true,
        aiClassified: true,
        pipelineMoved: true,
      }),
    ).toBe(true);
  });
});

describe("activationNextMilestone", () => {
  it("returns the first incomplete milestone", () => {
    expect(
      activationNextMilestone({
        whatsappConnected: true,
        firstInbound: false,
        aiClassified: false,
        pipelineMoved: false,
      }).id,
    ).toBe("firstInbound");
  });

  it("returns complete when all milestones are done", () => {
    expect(
      activationNextMilestone({
        whatsappConnected: true,
        firstInbound: true,
        aiClassified: true,
        pipelineMoved: true,
      }).id,
    ).toBe("complete");
  });
});
