import { PageHeader } from "@/components/dashboard/page-header";

export default function AutomationsLoading() {
  return (
    <div className="dashboard-page">
      <PageHeader title="Automations" description="Loading automations…" />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
