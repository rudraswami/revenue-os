import {
  mapInboundMessageStatusToCampaignStatus,
  shouldAdvanceCampaignRecipientStatus,
} from "./campaign-delivery.util";

describe("campaign-delivery.util", () => {
  it("maps Meta message statuses to campaign recipient statuses", () => {
    expect(mapInboundMessageStatusToCampaignStatus("DELIVERED")).toBe("DELIVERED");
    expect(mapInboundMessageStatusToCampaignStatus("READ")).toBe("READ");
    expect(mapInboundMessageStatusToCampaignStatus("FAILED")).toBe("FAILED");
    expect(mapInboundMessageStatusToCampaignStatus("unknown")).toBeNull();
  });

  it("advances SENT → DELIVERED → READ but not backwards", () => {
    expect(shouldAdvanceCampaignRecipientStatus("SENT", "DELIVERED")).toBe(true);
    expect(shouldAdvanceCampaignRecipientStatus("DELIVERED", "READ")).toBe(true);
    expect(shouldAdvanceCampaignRecipientStatus("READ", "DELIVERED")).toBe(false);
    expect(shouldAdvanceCampaignRecipientStatus("SENT", "FAILED")).toBe(true);
    expect(shouldAdvanceCampaignRecipientStatus("FAILED", "DELIVERED")).toBe(false);
  });
});
