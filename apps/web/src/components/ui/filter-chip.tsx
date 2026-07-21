/**
 * Filter chip — optional facets with counts (multi or exclusive lists).
 * For 2–4 exclusive scopes prefer SegmentedControl (soft selection, not CTA green).
 */
import { cn } from "@/lib/utils";

export function FilterChip({
  active,
  onClick,
  children,
  count,
  attention,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  count?: number;
  /** Amber treatment for “needs you” style filters */
  attention?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        active
          ? attention
            ? "bg-warning/15 text-warning ring-1 ring-warning/30"
            : "bg-accent/10 text-accent ring-1 ring-accent/15"
          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {count != null && count > 0 ? ` · ${count}` : ""}
    </button>
  );
}
