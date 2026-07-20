import { HOT_LEAD_SCORE_THRESHOLD } from "@growvisi/shared";
import { formatInr } from "@/lib/crm";

export interface InboxListLeadSignal {
  stage?: string;
  score?: number;
  valueCents?: number | null;
}

export type InboxListQueueBadge =
  | { kind: "your_turn" }
  | { kind: "deal_value"; label: string }
  | { kind: "hot_score"; score: number }
  | { kind: "stage"; stage: string };

/** Queue-first list metadata — used for sorting; list UI shows signals subtly on the row. */
export function inboxListQueueBadges(
  lead: InboxListLeadSignal | null | undefined,
  options: {
    yourTurn?: boolean;
    closed?: boolean;
    stageLabel: (stage: string) => string;
  },
): InboxListQueueBadge[] {
  const badges: InboxListQueueBadge[] = [];

  if (options.yourTurn) {
    badges.push({ kind: "your_turn" });
  }

  const valueCents = lead?.valueCents;
  if (valueCents != null && valueCents > 0) {
    badges.push({ kind: "deal_value", label: formatInr(valueCents) });
  }

  const score = lead?.score ?? 0;
  if (score >= HOT_LEAD_SCORE_THRESHOLD) {
    badges.push({ kind: "hot_score", score });
  }

  const stage = lead?.stage;
  const isClosedStage = stage === "WON" || stage === "LOST";
  if (stage && (options.closed || isClosedStage) && badges.length < 2) {
    badges.push({ kind: "stage", stage });
  }

  return badges;
}
