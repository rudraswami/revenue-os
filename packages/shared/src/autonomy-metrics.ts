/** Aggregated autonomy metrics for owner reporting (digest, Intelligence home). */

export interface AutonomyMetricsInput {
  periodDays: number;
  classifiedTurns: number;
  autoSent: number;
  draftsPlanned: number;
  draftUsedAsIs: number;
  draftHeavilyEdited: number;
  draftRejected: number;
  blockerCounts: Record<string, number>;
}

export interface AutonomyMetricsSnapshot {
  periodDays: number;
  classifiedTurns: number;
  autoSent: number;
  draftsPlanned: number;
  draftUsedAsIs: number;
  draftHeavilyEdited: number;
  draftRejected: number;
  /** % of classified turns that auto-sent */
  autoSendRate: number;
  /** % of human-reviewed drafts accepted with minimal edits */
  draftAcceptanceRate: number;
  topBlockers: Array<{ code: string; count: number }>;
}

export function buildAutonomyMetricsSnapshot(
  input: AutonomyMetricsInput,
): AutonomyMetricsSnapshot {
  const classified = Math.max(0, input.classifiedTurns);
  const autoSent = Math.max(0, input.autoSent);
  const draftReviews =
    input.draftUsedAsIs + input.draftHeavilyEdited + input.draftRejected;

  const autoSendRate =
    classified > 0 ? Math.round((autoSent / classified) * 1000) / 1000 : 0;

  const draftAcceptanceRate =
    draftReviews > 0
      ? Math.round((input.draftUsedAsIs / draftReviews) * 1000) / 1000
      : 0;

  const topBlockers = Object.entries(input.blockerCounts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    periodDays: input.periodDays,
    classifiedTurns: classified,
    autoSent,
    draftsPlanned: input.draftsPlanned,
    draftUsedAsIs: input.draftUsedAsIs,
    draftHeavilyEdited: input.draftHeavilyEdited,
    draftRejected: input.draftRejected,
    autoSendRate,
    draftAcceptanceRate,
    topBlockers,
  };
}
