/** Max send batches per Vercel `waitUntil` chunk (~8 × 25 recipients, ~30s budget). */
export const VERCEL_SEND_MAX_BATCHES_PER_INVOCATION = 8;

/** Re-kick a RUNNING campaign when no progress after this long. */
export const STUCK_CAMPAIGN_RECOVERY_AFTER_MS = 5 * 60 * 1000;

/** Debounce recovery kicks from progress polling (per warm instance). */
export const CAMPAIGN_RECOVERY_KICK_DEBOUNCE_MS = 10 * 60 * 1000;

/**
 * Campaign sends on Vercel use `waitUntil` instead of QStash callbacks.
 * QStash remains for other durable jobs (embed, cron fan-out, etc.).
 */
export function useVercelWaitUntilCampaignSend(onVercel = process.env.VERCEL === "1"): boolean {
  return onVercel;
}

/** Chain another `waitUntil` when a large send would exceed one invocation budget. */
export function shouldChainCampaignSendInvocation(
  batchesProcessed: number,
  hasMore: boolean,
  onVercel = process.env.VERCEL === "1",
): boolean {
  return onVercel && hasMore && batchesProcessed >= VERCEL_SEND_MAX_BATCHES_PER_INVOCATION;
}

export function isCampaignSendStuck(
  startedAt: Date | null,
  pendingRecipients: number,
  sentCount: number,
  failedCount: number,
  nowMs = Date.now(),
): boolean {
  if (!startedAt || pendingRecipients <= 0) return false;
  // Progress polling must not re-kick a healthy large send that is already
  // delivering — only zero-progress RUNNING campaigns (the observed failure mode).
  if (sentCount > 0 || failedCount > 0) return false;
  return nowMs - startedAt.getTime() >= STUCK_CAMPAIGN_RECOVERY_AFTER_MS;
}

/** Cron recovery: no recipient/counter activity for the stuck window. */
export function isCampaignSendStalled(
  pendingRecipients: number,
  lastProgressAt: Date | null,
  nowMs = Date.now(),
): boolean {
  if (!lastProgressAt || pendingRecipients <= 0) return false;
  return nowMs - lastProgressAt.getTime() >= STUCK_CAMPAIGN_RECOVERY_AFTER_MS;
}
