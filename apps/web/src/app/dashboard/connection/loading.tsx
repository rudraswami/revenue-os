import { PanelRowsSkeleton } from "@/components/ui/page-loading";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConnectionLoading() {
  return (
    <div className="dashboard-page space-y-6">
      <div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <PanelRowsSkeleton rows={4} />
    </div>
  );
}
