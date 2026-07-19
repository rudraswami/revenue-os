"use client";

import { Megaphone } from "lucide-react";
import { CampaignCard, type CampaignCardData } from "@/components/dashboard/campaign-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { QueryErrorState } from "@/components/ui/query-state";
import { cn } from "@/lib/utils";

type ListFilter = "all" | "draft" | "scheduled" | "sent";

const LIST_FILTERS: { id: ListFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
];

export function CampaignsListSection({
  campaigns,
  listFilter,
  onListFilterChange,
  scheduledCount,
  isLoading,
  isError,
  onRetry,
  onSelectCampaign,
}: {
  campaigns: CampaignCardData[];
  listFilter: ListFilter;
  onListFilterChange: (f: ListFilter) => void;
  scheduledCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectCampaign: (id: string) => void;
}) {
  const filtered = campaigns.filter((c) => {
    if (listFilter === "all") return true;
    if (listFilter === "draft") return c.status === "DRAFT" || c.status === "FAILED";
    if (listFilter === "scheduled") return c.status === "SCHEDULED";
    return c.status === "COMPLETED" || c.status === "RUNNING";
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card elev-1">
      <div className="border-b border-border/70 bg-gradient-to-r from-background via-card to-bento-mint/30 px-5 py-5 md:px-6">
        <h3 className="font-sans text-lg font-bold tracking-tight text-foreground">
          Your campaigns
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a card for delivery funnel, recipients, export, and send actions.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LIST_FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={listFilter === f.id}
              count={f.id === "scheduled" && scheduledCount > 0 ? scheduledCount : undefined}
              onClick={() => onListFilterChange(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="p-5 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <GrowvisiSpinner />
          </div>
        ) : isError ? (
          <QueryErrorState title="Couldn't load campaigns" onRetry={onRetry} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-7 w-7" />}
            title={listFilter === "all" ? "No campaigns yet" : `No ${listFilter} campaigns`}
            description="Complete the wizard above — name, approved template, and audience — then save your first broadcast."
            className="py-12"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((c) => (
              <CampaignCard key={c.id} campaign={c} onClick={() => onSelectCampaign(c.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type { ListFilter };
