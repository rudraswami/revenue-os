import type { LeadStage } from "@growvisi/shared";

export const OPEN_STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
];

export const STALE_REPLY_HOURS = 48;
export const STALE_STAGE_DAYS = 3;
export const HOT_SCORE_THRESHOLD = 80;

export type PipelineFilter = "hot" | "stale" | "mine" | "unassigned";

export interface LeadProfileSlice {
  lastIntent?: string | null;
  nextAction?: string | null;
}

export function readProfileSlice(profile: unknown): LeadProfileSlice {
  const p = (profile && typeof profile === "object" ? profile : {}) as Record<string, unknown>;
  return {
    lastIntent: typeof p.lastIntent === "string" ? p.lastIntent : null,
    nextAction: typeof p.nextAction === "string" ? p.nextAction : null,
  };
}

export function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

export function hoursSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 3_600_000);
}

export function computePipelineSignals(opts: {
  stage: LeadStage;
  score: number;
  stageEnteredAt: Date;
  lastInboundAt: Date | null | undefined;
  unreadCount: number;
  requiresHuman: boolean;
  ownerId: string | null;
}) {
  const daysInStage = daysSince(opts.stageEnteredAt) ?? 0;
  const hoursSinceReply = hoursSince(opts.lastInboundAt);
  const isOpen = OPEN_STAGES.includes(opts.stage);
  const noReplyStale =
    isOpen &&
    opts.lastInboundAt != null &&
    (hoursSinceReply ?? 0) >= STALE_REPLY_HOURS &&
    (opts.unreadCount > 0 || opts.requiresHuman);
  const stageStale = isOpen && daysInStage >= STALE_STAGE_DAYS;
  const isStale = noReplyStale || stageStale;
  const staleLabel = noReplyStale
    ? `No reply · ${hoursSinceReply}h`
    : stageStale
      ? `In stage · ${daysInStage}d`
      : null;

  return {
    daysInStage,
    isHot: opts.score >= HOT_SCORE_THRESHOLD,
    isStale,
    staleLabel,
    waitingOnTeam: isOpen && (opts.unreadCount > 0 || opts.requiresHuman),
    isUnassigned: opts.ownerId == null,
  };
}

export function matchesPipelineFilter(
  filter: PipelineFilter,
  lead: {
    score: number;
    isStale: boolean;
    ownerId: string | null;
    waitingOnTeam: boolean;
  },
  userId: string,
): boolean {
  switch (filter) {
    case "hot":
      return lead.score >= HOT_SCORE_THRESHOLD;
    case "stale":
      return lead.isStale;
    case "mine":
      return lead.ownerId === userId;
    case "unassigned":
      return lead.ownerId == null;
    default:
      return true;
  }
}
