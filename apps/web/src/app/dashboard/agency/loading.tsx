import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/loading";

export default function AgencyLoading() {
  return (
    <div className="dashboard-page" aria-busy="true">
      <PageHeader title="Agency" description="Manage every client workspace from one hub." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
