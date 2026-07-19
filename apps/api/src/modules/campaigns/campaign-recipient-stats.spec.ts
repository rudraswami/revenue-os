import { recipientStatsToProgress } from "./campaign-recipient-stats";

describe("recipientStatsToProgress", () => {
  it("computes progress and delivery percentages", () => {
    const result = recipientStatsToProgress(100, {
      pending: 10,
      sent: 20,
      delivered: 50,
      read: 15,
      failed: 5,
      skipped: 0,
      replied: 8,
    });

    expect(result.attempted).toBe(90);
    expect(result.deliveredOrRead).toBe(65);
    expect(result.progressPct).toBe(90);
    expect(result.deliveryPct).toBe(65);
    expect(result.replyPct).toBe(12);
  });

  it("handles empty campaigns", () => {
    const result = recipientStatsToProgress(0, {
      pending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      skipped: 0,
      replied: 0,
    });
    expect(result.progressPct).toBe(0);
    expect(result.deliveryPct).toBe(0);
  });
});
