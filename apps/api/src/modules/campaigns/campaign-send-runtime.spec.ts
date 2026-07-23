import {
  CAMPAIGN_RECOVERY_KICK_DEBOUNCE_MS,
  isCampaignSendStuck,
  isCampaignSendStalled,
  shouldChainCampaignSendInvocation,
  STUCK_CAMPAIGN_RECOVERY_AFTER_MS,
  useVercelWaitUntilCampaignSend,
  VERCEL_SEND_MAX_BATCHES_PER_INVOCATION,
} from "./campaign-send-runtime";

describe("campaign-send-runtime", () => {
  it("routes Vercel campaign sends through waitUntil, not QStash", () => {
    expect(useVercelWaitUntilCampaignSend(true)).toBe(true);
    expect(useVercelWaitUntilCampaignSend(false)).toBe(false);
  });

  it("chains another waitUntil chunk when the Vercel batch budget is exhausted", () => {
    expect(
      shouldChainCampaignSendInvocation(
        VERCEL_SEND_MAX_BATCHES_PER_INVOCATION,
        true,
        true,
      ),
    ).toBe(true);
    expect(
      shouldChainCampaignSendInvocation(
        VERCEL_SEND_MAX_BATCHES_PER_INVOCATION - 1,
        true,
        true,
      ),
    ).toBe(false);
    expect(shouldChainCampaignSendInvocation(10, true, false)).toBe(false);
    expect(shouldChainCampaignSendInvocation(10, false, true)).toBe(false);
  });

  it("detects stuck RUNNING campaigns with pending recipients and zero progress", () => {
    const startedAt = new Date(Date.now() - STUCK_CAMPAIGN_RECOVERY_AFTER_MS - 1_000);
    expect(isCampaignSendStuck(startedAt, 4, 0, 0)).toBe(true);
    expect(isCampaignSendStuck(startedAt, 0, 0, 0)).toBe(false);
    expect(isCampaignSendStuck(null, 4, 0, 0)).toBe(false);
    expect(isCampaignSendStuck(startedAt, 4, 1, 0)).toBe(false);
    expect(isCampaignSendStuck(startedAt, 4, 0, 2)).toBe(false);
    expect(
      isCampaignSendStuck(
        new Date(Date.now() + 60_000),
        4,
        0,
        0,
      ),
    ).toBe(false);
  });

  it("detects stalled mid-send campaigns via last progress timestamp", () => {
    const stale = new Date(Date.now() - STUCK_CAMPAIGN_RECOVERY_AFTER_MS - 1_000);
    expect(isCampaignSendStalled(100, stale)).toBe(true);
    expect(isCampaignSendStalled(0, stale)).toBe(false);
    expect(isCampaignSendStalled(100, new Date())).toBe(false);
  });

  it("documents recovery debounce for progress polling", () => {
    expect(CAMPAIGN_RECOVERY_KICK_DEBOUNCE_MS).toBeGreaterThanOrEqual(
      STUCK_CAMPAIGN_RECOVERY_AFTER_MS,
    );
  });
});
