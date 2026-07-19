import { Skeleton } from "@/components/ui/skeleton";
import { PanelRowsSkeleton } from "@/components/ui/page-loading";

export default function PartnerLoading() {
  return (
    <div className="dashboard-page space-y-6" aria-busy="true" aria-label="Loading partner kit">
      <div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <PanelRowsSkeleton rows={6} />
    </div>
  );
}
