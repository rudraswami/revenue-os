export type AutomationId =
  | "welcome"
  | "followup"
  | "stage"
  | "notify"
  | "handoff"
  | "staleDeal"
  | "stageNotify";

export type AutomationPreferences = Record<AutomationId, boolean>;

export const DEFAULT_AUTOMATION_PREFERENCES: AutomationPreferences = {
  welcome: true,
  followup: true,
  stage: true,
  notify: false,
  handoff: true,
  staleDeal: false,
  stageNotify: false,
};

export function normalizeAutomationPreferences(
  raw: unknown,
): AutomationPreferences {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<AutomationId, boolean>
  >;
  return {
    welcome: input.welcome ?? DEFAULT_AUTOMATION_PREFERENCES.welcome,
    followup: input.followup ?? DEFAULT_AUTOMATION_PREFERENCES.followup,
    stage: input.stage ?? DEFAULT_AUTOMATION_PREFERENCES.stage,
    notify: input.notify ?? DEFAULT_AUTOMATION_PREFERENCES.notify,
    handoff: input.handoff ?? DEFAULT_AUTOMATION_PREFERENCES.handoff,
    staleDeal: input.staleDeal ?? DEFAULT_AUTOMATION_PREFERENCES.staleDeal,
    stageNotify: input.stageNotify ?? DEFAULT_AUTOMATION_PREFERENCES.stageNotify,
  };
}
