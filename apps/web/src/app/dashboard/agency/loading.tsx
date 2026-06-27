import { PanelRowsSkeleton } from "@/components/ui/page-loading";

export default function AgencyLoading() {
  return (
    <div className="dashboard-page">
      <PanelRowsSkeleton rows={4} />
    </div>
  );
}
