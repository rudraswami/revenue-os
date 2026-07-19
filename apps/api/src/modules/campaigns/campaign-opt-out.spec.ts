import {
  CAMPAIGN_SKIP_REASON_OPT_OUT,
  isCampaignOptOutMessage,
  readCampaignOptOut,
  withCampaignOptOutProfile,
} from "./campaign-opt-out";

describe("campaign-opt-out", () => {
  it("detects common opt-out keywords", () => {
    expect(isCampaignOptOutMessage("STOP")).toBe(true);
    expect(isCampaignOptOutMessage("opt out")).toBe(true);
    expect(isCampaignOptOutMessage("unsubscribe")).toBe(true);
    expect(isCampaignOptOutMessage("बंद")).toBe(true);
  });

  it("ignores normal messages", () => {
    expect(isCampaignOptOutMessage("Please stop by tomorrow")).toBe(false);
    expect(isCampaignOptOutMessage("")).toBe(false);
  });

  it("reads and writes profile opt-out", () => {
    const profile = withCampaignOptOutProfile({}, true, "keyword");
    expect(readCampaignOptOut(profile)).toBe(true);
    const cleared = withCampaignOptOutProfile(profile, false, "manual");
    expect(readCampaignOptOut(cleared)).toBe(false);
  });

  it("exports skip reason constant", () => {
    expect(CAMPAIGN_SKIP_REASON_OPT_OUT).toContain("Opted out");
  });
});
