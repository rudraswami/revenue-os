/**
 * Conversations daily-queue habit events (agent WAU loop).
 * Safe no-op when dataLayer is absent.
 */
export type QueueEvent =
  | "queue_default_applied"
  | "queue_filter_click"
  | "queue_advance_next"
  | "queue_caught_up";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackQueue(
  event: QueueEvent,
  props?: Record<string, string | number | boolean | undefined>,
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    product: "growvisi",
    surface: "conversations",
    ...props,
    ts: Date.now(),
  };

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
  } catch {
    /* ignore */
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[queue]", payload);
  }
}

/** Prefer Your turn → Mine → Unassigned → all. */
export function pickDailyQueueFilter(counts: {
  yourTurn: number;
  mine: number;
  unassigned: number;
}): "handoff" | "mine" | "unassigned" | "all" {
  if (counts.yourTurn > 0) return "handoff";
  if (counts.mine > 0) return "mine";
  if (counts.unassigned > 0) return "unassigned";
  return "all";
}
