export type WhatsappConnectionState = "connected" | "disconnected" | "unknown";

/** Whether to show the global "Connect WhatsApp" shell banner. */
export function shouldShowWhatsappConnectBanner(params: {
  hasToken: boolean;
  isAgency: boolean;
  accounts: Array<{ isActive: boolean }> | undefined;
  persistedWhatsappConnected: boolean | undefined;
}): boolean {
  if (!params.hasToken || params.isAgency) return false;

  if (params.accounts != null) {
    return !params.accounts.some((a) => a.isActive);
  }

  // Still loading — never flash "connect" when session already says connected.
  if (params.persistedWhatsappConnected === true) return false;

  return false;
}

/**
 * Resolve WhatsApp connection for inbox and sidebar chrome.
 * Never treat "unknown" (bootstrap/accounts still loading) as disconnected.
 */
export function resolveWhatsappConnectionState(params: {
  accounts: Array<{ isActive: boolean }> | undefined;
  persistedWhatsappConnected: boolean | undefined;
  /** Inbox already has threads — connection is proven regardless of shell cache. */
  hasConversations?: boolean;
}): WhatsappConnectionState {
  if (params.hasConversations) return "connected";

  if (params.accounts != null) {
    return params.accounts.some((a) => a.isActive) ? "connected" : "disconnected";
  }

  if (params.persistedWhatsappConnected === true) return "connected";

  return "unknown";
}

export function isWhatsappConnected(state: WhatsappConnectionState): boolean {
  return state === "connected";
}

export function showWhatsappDisconnected(state: WhatsappConnectionState): boolean {
  return state === "disconnected";
}
