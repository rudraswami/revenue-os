import { PageHeader } from "@/components/dashboard/page-header";

export default function CampaignsLoading() {
  return (
    <div className="dashboard-page">
      <PageHeader title="Campaigns" description="Loading campaigns…" />
      <div className="mb-6 h-16 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
