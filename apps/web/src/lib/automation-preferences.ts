const STORAGE_PREFIX = "growvisi-automations";

export type AutomationId =
  | "welcome"
  | "followup"
  | "stage"
  | "notify"
  | "handoff"
  | "staleDeal"
  | "stageNotify";

export const DEFAULT_AUTOMATIONS: Record<AutomationId, boolean> = {
  welcome: true,
  followup: true,
  stage: true,
  notify: false,
  handoff: true,
  staleDeal: false,
  stageNotify: false,
};

function storageKey(organizationId: string) {
  return `${STORAGE_PREFIX}:${organizationId}`;
}

export function loadAutomationPreferences(
  organizationId: string | undefined,
): Record<AutomationId, boolean> {
  if (!organizationId || typeof window === "undefined") {
    return { ...DEFAULT_AUTOMATIONS };
  }
  try {
    const raw = localStorage.getItem(storageKey(organizationId));
    if (!raw) return { ...DEFAULT_AUTOMATIONS };
    return { ...DEFAULT_AUTOMATIONS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_AUTOMATIONS };
  }
}

export function saveAutomationPreferences(
  organizationId: string,
  prefs: Record<AutomationId, boolean>,
) {
  localStorage.setItem(storageKey(organizationId), JSON.stringify(prefs));
}
