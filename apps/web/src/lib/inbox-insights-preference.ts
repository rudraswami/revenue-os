const STORAGE_KEY = "gv:inbox-insights-open";

export function loadInboxInsightsOpen(): boolean {
  if (typeof globalThis.localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return false;
  } catch {
    return false;
  }
}

export function saveInboxInsightsOpen(open: boolean): void {
  if (typeof globalThis.localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Auto-expand when handoff or low confidence — revenue signals. */
export function shouldAutoOpenInboxInsights(input: {
  requiresHuman?: boolean;
  aiConfidence?: number | null;
  valueCents?: number | null;
}): boolean {
  if (input.requiresHuman) return true;
  if (input.aiConfidence != null && input.aiConfidence < 0.6) return true;
  if (input.valueCents != null && input.valueCents >= 500_000) return true;
  return false;
}
