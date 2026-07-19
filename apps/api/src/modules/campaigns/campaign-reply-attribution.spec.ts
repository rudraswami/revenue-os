import {
  normalizeCampaignPhone,
  phonesMatch,
  parseCampaignAttributionMeta,
} from "./campaign-reply-attribution";

describe("campaign-reply-attribution", () => {
  describe("normalizeCampaignPhone", () => {
    it("strips non-digits", () => {
      expect(normalizeCampaignPhone("+91 98765-43210")).toBe("919876543210");
    });
  });

  describe("phonesMatch", () => {
    it("matches exact digits", () => {
      expect(phonesMatch("919876543210", "919876543210")).toBe(true);
    });

    it("matches last 10 digits across country code variants", () => {
      expect(phonesMatch("9876543210", "919876543210")).toBe(true);
    });

    it("rejects different numbers", () => {
      expect(phonesMatch("919876543210", "919876543211")).toBe(false);
    });
  });

  describe("parseCampaignAttributionMeta", () => {
    it("parses valid metadata", () => {
      const result = parseCampaignAttributionMeta({
        campaignAttribution: {
          campaignId: "c1",
          campaignName: "Diwali offer",
          recipientId: "r1",
          attributedAt: "2026-07-19T10:00:00.000Z",
          trigger: "inbound_reply",
        },
      });
      expect(result?.campaignName).toBe("Diwali offer");
    });

    it("returns null for missing data", () => {
      expect(parseCampaignAttributionMeta({})).toBeNull();
    });
  });
});
