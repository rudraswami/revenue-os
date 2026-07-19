import { buildCampaignRecipientsCsv } from "./campaign-csv.util";

describe("campaign-csv.util", () => {
  it("escapes commas and quotes", () => {
    expect(buildCampaignRecipientsCsv([
      {
        phone: "919876543210",
        name: 'Acme, "India"',
        status: "DELIVERED",
        sentAt: new Date("2026-07-19T10:00:00.000Z"),
      },
    ])).toContain('"Acme, ""India"""');
  });
});
