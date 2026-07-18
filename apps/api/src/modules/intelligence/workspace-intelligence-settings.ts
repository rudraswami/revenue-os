import {
  DEFAULT_INTELLIGENCE_SETTINGS,
  REPLY_AUTONOMY_MODES,
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

  return { replyAutonomy };
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
