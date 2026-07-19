/** Campaign broadcast opt-out stored on `Lead.profile`. */
export const CAMPAIGN_OPT_OUT_PROFILE_KEY = "campaignOptOut";
export const CAMPAIGN_OPT_OUT_AT_KEY = "campaignOptOutAt";
export const CAMPAIGN_OPT_OUT_SOURCE_KEY = "campaignOptOutSource";

export type CampaignOptOutSource = "keyword" | "manual";

const OPT_OUT_PATTERNS = [
  /^\s*stop\s*$/i,
  /^\s*unsubscribe\s*$/i,
  /^\s*opt[\s-]?out\s*$/i,
  /^\s*remove(\s+me)?\s*$/i,
  /^\s*don'?t\s+message(\s+me)?\s*$/i,
  /^\s*do\s+not\s+(message|contact)(\s+me)?\s*$/i,
  /^\s*बंद\s*$/,
  /^\s*रोक(ें|ो)?\s*$/,
];

export function isCampaignOptOutMessage(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const normalized = text.trim();
  return OPT_OUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function readCampaignOptOut(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") return false;
  return (profile as Record<string, unknown>)[CAMPAIGN_OPT_OUT_PROFILE_KEY] === true;
}

export function readCampaignOptOutMeta(profile: unknown): {
  optedOut: boolean;
  at: string | null;
  source: CampaignOptOutSource | null;
} {
  if (!profile || typeof profile !== "object") {
    return { optedOut: false, at: null, source: null };
  }
  const p = profile as Record<string, unknown>;
  return {
    optedOut: p[CAMPAIGN_OPT_OUT_PROFILE_KEY] === true,
    at: typeof p[CAMPAIGN_OPT_OUT_AT_KEY] === "string" ? p[CAMPAIGN_OPT_OUT_AT_KEY] : null,
    source:
      p[CAMPAIGN_OPT_OUT_SOURCE_KEY] === "keyword" ||
      p[CAMPAIGN_OPT_OUT_SOURCE_KEY] === "manual"
        ? p[CAMPAIGN_OPT_OUT_SOURCE_KEY]
        : null,
  };
}

export function withCampaignOptOutProfile(
  profile: unknown,
  optedOut: boolean,
  source: CampaignOptOutSource,
): Record<string, unknown> {
  const base =
    profile && typeof profile === "object" && !Array.isArray(profile)
      ? { ...(profile as Record<string, unknown>) }
      : {};

  if (optedOut) {
    return {
      ...base,
      [CAMPAIGN_OPT_OUT_PROFILE_KEY]: true,
      [CAMPAIGN_OPT_OUT_AT_KEY]: new Date().toISOString(),
      [CAMPAIGN_OPT_OUT_SOURCE_KEY]: source,
    };
  }

  const next = { ...base };
  delete next[CAMPAIGN_OPT_OUT_PROFILE_KEY];
  delete next[CAMPAIGN_OPT_OUT_AT_KEY];
  delete next[CAMPAIGN_OPT_OUT_SOURCE_KEY];
  return next;
}

export const CAMPAIGN_SKIP_REASON_OPT_OUT = "Opted out of WhatsApp broadcasts";
