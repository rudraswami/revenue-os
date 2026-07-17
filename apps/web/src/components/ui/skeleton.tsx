import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function InboxListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border px-6 py-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
      <div className="flex-1 space-y-3 bg-muted/20 p-6">
        <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl rounded-br-md" />
        <Skeleton className="h-12 w-2/3 rounded-2xl rounded-bl-md" />
        <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl rounded-br-md" />
      </div>
    </div>
  );
}

export function MetricCardsSkeleton({ variant = "default" }: { variant?: "default" | "home" }) {
  if (variant === "home") {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-5 w-48" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 elev-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-9 w-14" />
                <Skeleton className="mt-3 h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-24" />
          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-4 h-12 w-28" />
            </div>
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-12" />
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-8 w-12" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="min-w-[272px] shrink-0">
          <Skeleton className="mb-3 h-5 w-24" />
          <div className="space-y-2 rounded-xl bg-muted/50 p-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex h-72 items-end gap-3 px-4 pb-8">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${30 + (i % 4) * 15}%` }} />
      ))}
    </div>
  );
}
