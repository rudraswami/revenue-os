import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/loading";

export default function CampaignsLoading() {
  return (
    <div className="dashboard-page" aria-busy="true">
      <div className="dashboard-hero campaigns-page-hero mb-6 rounded-3xl border border-accent/15 bg-gradient-to-br from-bento-mint/80 via-card to-viz-violet/10 p-6 md:p-8 elev-1">
        <PageHeader
          className="mb-0"
          title="Campaigns"
          description="Broadcast approved WhatsApp templates, track delivery and replies, and close the loop from Inbox."
        />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
