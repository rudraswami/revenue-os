import { Skeleton } from "@/components/ui/skeleton";

const NAV_ITEMS = 6;

export function SettingsPageSkeleton() {
  return (
    <div className="dashboard-page" aria-busy="true" aria-label="Loading settings">
      <div className="mb-8">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-9 w-36" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <nav className="hidden shrink-0 lg:block lg:w-56" aria-hidden>
          <div className="rounded-2xl border border-border/80 bg-white p-2 shadow-[0_4px_20px_rgb(11_28_48/0.04)]">
            <div className="space-y-0.5">
              {Array.from({ length: NAV_ITEMS }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </nav>

        <div className="lg:hidden" aria-hidden>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-start gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
            </div>
          </div>

          <div className="min-h-[420px] space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-white">
              <div className="border-b border-border/60 bg-[#fafbfd] px-5 py-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-2 h-3 w-52" />
              </div>
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
