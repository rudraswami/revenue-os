"use client";

import { memo } from "react";
import { FileText, Plus } from "lucide-react";
import type { MessageTemplateView } from "@growvisi/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { QueryErrorState } from "@/components/ui/query-state";
import { Button } from "@/components/ui/button";
import { TemplateRow } from "./template-row";
import { TEMPLATES } from "@/lib/brand-copy";

export type TemplateStatusFilter = "all" | "approved" | "pending" | "rejected";

const FILTERS: Array<{ id: TemplateStatusFilter; label: string; countKey?: keyof TemplateCounts }> = [
  { id: "all", label: "All", countKey: "total" },
  { id: "approved", label: "Approved", countKey: "approved" },
  { id: "pending", label: "Pending", countKey: "pending" },
  { id: "rejected", label: "Rejected", countKey: "rejected" },
];

type TemplateCounts = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
};

export const TemplateListSection = memo(function TemplateListSection({
  templates,
  filter,
  onFilterChange,
  counts,
  isLoading,
  isError,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: {
  templates: MessageTemplateView[];
  filter: TemplateStatusFilter;
  onFilterChange: (f: TemplateStatusFilter) => void;
  counts?: TemplateCounts;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (t: MessageTemplateView) => void;
  onDelete: (t: MessageTemplateView) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card elev-1">
      <div className="border-b border-border/70 bg-gradient-to-r from-background via-card to-bento-mint/30 px-5 py-5 md:px-6">
        <h2 className="font-sans text-lg font-bold tracking-tight text-foreground">
          {TEMPLATES.yourTemplates}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{TEMPLATES.listHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.id}
              active={filter === f.id}
              count={f.countKey && counts ? counts[f.countKey] : undefined}
              attention={f.id === "pending" && (counts?.pending ?? 0) > 0}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <GrowvisiSpinner size="sm" />
            {TEMPLATES.loading}
          </div>
        ) : isError ? (
          <div className="p-5 md:p-6">
            <QueryErrorState
              title={TEMPLATES.loadError}
              message={TEMPLATES.loadErrorHint}
              onRetry={onRetry}
            />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-5 md:p-6">
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title={filter === "all" ? TEMPLATES.emptyTitle : `No ${filter} templates`}
              description={
                filter === "all"
                  ? TEMPLATES.emptyDescription
                  : "Try another filter or create a new template."
              }
              action={
                filter === "all" ? (
                  <Button onClick={onCreate} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    {TEMPLATES.emptyAction}
                  </Button>
                ) : undefined
              }
              className="py-12"
            />
          </div>
        ) : (
          <ul>
            {templates.map((t) => (
              <TemplateRow
                key={`${t.name}-${t.language}`}
                template={t}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
