/**
 * Shared filter chip — exclusive or multi-select list facets.
 * Use SegmentedControl patterns (muted track) for 2–4 exclusive scopes.
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
        "shrink-0 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        active
          ? attention
            ? "bg-amber-600 text-white shadow-sm"
            : "bg-accent text-accent-foreground shadow-sm"
          : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {count != null && count > 0 ? ` · ${count}` : ""}
    </button>
  );
}
