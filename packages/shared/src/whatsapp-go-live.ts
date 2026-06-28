export type AgencyConnectionStatus = "live" | "setup" | "token" | "disconnected";

/** Go-live checklist progress (connected step + N sub-steps). */
export function computeGoLiveProgressPct(stepDoneFlags: boolean[], connected: boolean): number {
  const doneCount = stepDoneFlags.filter(Boolean).length + (connected ? 1 : 0);
  const totalCount = stepDoneFlags.length + 1;
  if (totalCount === 0) return 0;
  return Math.round((doneCount / totalCount) * 100);
}

export function deriveAgencyConnectionStatus(opts: {
  connected: boolean;
  tokenNeedsRefresh: boolean;
  goLiveProgressPct: number;
  firstMessage: boolean;
  classified: boolean;
}): AgencyConnectionStatus {
  if (!opts.connected) return "disconnected";
  if (opts.tokenNeedsRefresh) return "token";
  if (opts.goLiveProgressPct >= 83 && opts.firstMessage && opts.classified) return "live";
  return "setup";
}

export function activationAllComplete(steps: {
  whatsappConnected: boolean;
  firstInbound: boolean;
  aiClassified: boolean;
  pipelineMoved: boolean;
}): boolean {
  return (
    steps.whatsappConnected &&
    steps.firstInbound &&
    steps.aiClassified &&
    steps.pipelineMoved
  );
}
