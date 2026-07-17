import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Centered inline loader for buttons and small areas */
export function InlineLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-accent" />
      {label}
    </span>
  );
}

/** Standard panel with header + row skeletons */
export function PanelRowsSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)} aria-busy="true" aria-label="Loading">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card elev-1">
        <div className="border-b border-border/60 bg-background px-5 py-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-52" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Dashboard home initial load — metrics grid */
export function DashboardHomeSkeleton() {
  return (
    <div className="dashboard-page space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
      <PanelRowsSkeleton rows={3} />
    </div>
  );
}

/** List / table pages */
export function DashboardListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="dashboard-page space-y-6" aria-busy="true">
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-48" />
      </div>
      <PanelRowsSkeleton rows={rows} />
    </div>
  );
}

/** Analytics-style charts */
export function DashboardAnalyticsSkeleton() {
  return (
    <div className="dashboard-page space-y-6" aria-busy="true">
      <div className="flex justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-40" />
        </div>
        <Skeleton className="h-9 w-48 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
