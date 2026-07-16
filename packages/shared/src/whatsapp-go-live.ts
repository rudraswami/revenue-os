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

export type ActivationMilestoneId =
  | "whatsappConnected"
  | "firstInbound"
  | "aiClassified"
  | "pipelineMoved";

/** Next incomplete activation step — drives Home / CS interventions. */
export function activationNextMilestone(steps: {
  whatsappConnected: boolean;
  firstInbound: boolean;
  aiClassified: boolean;
  pipelineMoved: boolean;
}): {
  id: ActivationMilestoneId | "complete";
  href: string;
  title: string;
  description: string;
} {
  if (!steps.whatsappConnected) {
    return {
      id: "whatsappConnected",
      href: "/dashboard/settings?tab=whatsapp",
      title: "Connect WhatsApp",
      description: "Link your business number so conversations can flow into Growvisi.",
    };
  }
  if (!steps.firstInbound) {
    return {
      id: "firstInbound",
      href: "/dashboard/inbox",
      title: "Get your first customer message",
      description: "Message your business number from your phone to confirm ingest.",
    };
  }
  if (!steps.aiClassified) {
    return {
      id: "aiClassified",
      href: "/dashboard/inbox",
      title: "See AI classify a lead",
      description: "Open Conversations — intent score and suggested stage appear on the thread.",
    };
  }
  if (!steps.pipelineMoved) {
    return {
      id: "pipelineMoved",
      href: "/dashboard/pipeline",
      title: "Move a deal on Pipeline",
      description: "Drag a card past New — your revenue board is live.",
    };
  }
  return {
    id: "complete",
    href: "/dashboard",
    title: "Activation complete",
    description: "WhatsApp → classify → pipeline is working in this workspace.",
  };
}
