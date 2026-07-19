import { PageHeader } from "@/components/dashboard/page-header";

export default function AutomationsLoading() {
  return (
    <div className="dashboard-page">
      <PageHeader title="Automations" description="Loading your assistant settings…" />
      <div className="mb-8 h-36 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="mt-12 h-px bg-border/60" />
      <div className="mt-8 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
