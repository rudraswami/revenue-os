import { PipelineSkeleton, Skeleton } from "@/components/ui/loading";

export default function PipelineLoading() {
  return (
    <div className="dashboard-page space-y-6" aria-busy="true">
      <div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-36" />
      </div>
      <PipelineSkeleton />
    </div>
  );
}
