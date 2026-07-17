/**
 * Semantic status colors — one meaning per tone.
 * Soft fills only: solid accent green is reserved for Button CTAs.
 * WhatsApp brand green only on WhatsApp-owned objects.
 */
export const STATUS_TONE = {
  /** Draft, idle, paused, low priority, neutral meta */
  muted: "bg-muted text-muted-foreground",
  /** Scheduled, contacted, informational */
  info: "bg-bento-blue text-foreground",
  /** In-progress / mid pipeline (not a CTA) */
  progress: "bg-primary-soft text-foreground",
  /** Needs attention soon */
  warning: "bg-amber-100 text-amber-900",
  /** Live, won, completed — soft mint, not solid CTA green */
  success: "bg-bento-mint text-accent",
  /** Failed, lost, urgent, destructive */
  danger: "bg-destructive/10 text-destructive",
  /** WhatsApp-connected / delivered via WA */
  whatsapp: "bg-bento-mint text-whatsapp",
} as const;

export type StatusTone = keyof typeof STATUS_TONE;

export function statusClass(tone: StatusTone): string {
  return STATUS_TONE[tone];
}
