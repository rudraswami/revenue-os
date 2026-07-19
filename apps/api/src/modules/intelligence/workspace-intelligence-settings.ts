import {
  AUTOMATION_POLICY_PRESETS,
  DEFAULT_AUTOMATION_SAFETY,
  DEFAULT_INTELLIGENCE_SETTINGS,
  REPLY_AUTONOMY_MODES,
  AUTOMATION_PRESET_DEFAULTS,
  type AutomationPolicyPreset,
  type IntelligenceWorkspaceSettings,
  type ReplyAutonomyMode,
} from "@growvisi/shared";

export function normalizeIntelligenceSettings(raw: unknown): IntelligenceWorkspaceSettings {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<IntelligenceWorkspaceSettings>;
  const mode = input.replyAutonomy;
  const replyAutonomy: ReplyAutonomyMode = REPLY_AUTONOMY_MODES.includes(
    mode as ReplyAutonomyMode,
  )
    ? (mode as ReplyAutonomyMode)
    : DEFAULT_INTELLIGENCE_SETTINGS.replyAutonomy;

  const presetRaw = input.automationPreset;
  const automationPreset: AutomationPolicyPreset = AUTOMATION_POLICY_PRESETS.includes(
    presetRaw as AutomationPolicyPreset,
  )
    ? (presetRaw as AutomationPolicyPreset)
    : DEFAULT_INTELLIGENCE_SETTINGS.automationPreset;

  const automationRules =
    input.automationRules && typeof input.automationRules === "object"
      ? input.automationRules
      : undefined;

  const safety =
    input.safety && typeof input.safety === "object" ? input.safety : undefined;

  return { replyAutonomy, automationPreset, automationRules, safety };
}

export function readIntelligenceSettingsFromOrg(
  settings: Record<string, unknown> | null | undefined,
): IntelligenceWorkspaceSettings {
  const intel =
    settings?.intelligence && typeof settings.intelligence === "object"
      ? settings.intelligence
      : {};
  return normalizeIntelligenceSettings(intel);
}

export { AUTOMATION_PRESET_DEFAULTS, DEFAULT_AUTOMATION_SAFETY };
