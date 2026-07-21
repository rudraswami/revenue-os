import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function AutomationsLoading() {
  return (
    <div className="dashboard-page" aria-busy="true">
      <PageHeader title="Automations" description="Configure how your AI assistant and team alerts work." />
      {/* Assistant zone */}
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="my-12 h-px bg-border/60" role="separator" />
      {/* Team alerts zone */}
      <Skeleton className="h-72 w-full rounded-2xl" />
      {/* Activity zone (collapsed) */}
      <div className="mt-10">
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
