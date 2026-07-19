/** Campaign recipient status progression from Meta delivery webhooks. */
export const CAMPAIGN_STATUS_RANK: Record<string, number> = {
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: -1,
};

export function mapInboundMessageStatusToCampaignStatus(
  mapped: string,
): "SENT" | "DELIVERED" | "READ" | "FAILED" | null {
  if (mapped === "DELIVERED") return "DELIVERED";
  if (mapped === "READ") return "READ";
  if (mapped === "FAILED") return "FAILED";
  if (mapped === "SENT") return "SENT";
  return null;
}

/** Whether to apply a new campaign recipient status from a webhook event. */
export function shouldAdvanceCampaignRecipientStatus(
  previousStatus: string,
  nextStatus: string,
): boolean {
  if (previousStatus === "FAILED") return false;
  if (nextStatus === "FAILED") return true;
  const prevRank = CAMPAIGN_STATUS_RANK[previousStatus] ?? 0;
  const newRank = CAMPAIGN_STATUS_RANK[nextStatus] ?? 0;
  return newRank > prevRank;
}
