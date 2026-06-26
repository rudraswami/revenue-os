export interface DigestSettings {
  enabled: boolean;
  /** Hour in IST (0–23) when the digest email is sent */
  hourIst: number;
  lastSentDate?: string | null;
}

export interface SlaSettings {
  /** Target first-response time in hours */
  targetHours: number;
}

export interface WorkspaceOpsSettings {
  digest: DigestSettings;
  sla: SlaSettings;
}

export const DEFAULT_DIGEST_SETTINGS: DigestSettings = {
  enabled: true,
  hourIst: 8,
  lastSentDate: null,
};

export const DEFAULT_SLA_SETTINGS: SlaSettings = {
  targetHours: 4,
};

export function normalizeWorkspaceOpsSettings(raw: unknown): WorkspaceOpsSettings {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const digestRaw = (input.digest ?? {}) as Partial<DigestSettings>;
  const slaRaw = (input.sla ?? {}) as Partial<SlaSettings>;

  const hourIst =
    typeof digestRaw.hourIst === "number" && digestRaw.hourIst >= 0 && digestRaw.hourIst <= 23
      ? Math.floor(digestRaw.hourIst)
      : DEFAULT_DIGEST_SETTINGS.hourIst;

  const targetHours =
    typeof slaRaw.targetHours === "number" && slaRaw.targetHours >= 1 && slaRaw.targetHours <= 72
      ? Math.floor(slaRaw.targetHours)
      : DEFAULT_SLA_SETTINGS.targetHours;

  return {
    digest: {
      enabled: digestRaw.enabled ?? DEFAULT_DIGEST_SETTINGS.enabled,
      hourIst,
      lastSentDate:
        typeof digestRaw.lastSentDate === "string" ? digestRaw.lastSentDate : null,
    },
    sla: { targetHours },
  };
}

/** Current clock in India (IST, UTC+5:30). */
export function getIstNow(): { hour: number; dateKey: string } {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const ist = new Date(utcMs + 5.5 * 3_600_000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return { hour: ist.getUTCHours(), dateKey: `${y}-${m}-${d}` };
}

export function formatDurationMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
