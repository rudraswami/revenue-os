"use client";

import { memo } from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";
import type { MessageTemplateView } from "@growvisi/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { QueryErrorState } from "@/components/ui/query-state";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "./template-card";
import { TEMPLATES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

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
  isRefreshing,
  lastSyncedAt,
  onRetry,
  onRefresh,
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
  isRefreshing?: boolean;
  lastSyncedAt?: string;
  onRetry: () => void;
  onRefresh: () => void;
  onCreate: () => void;
  onEdit: (t: MessageTemplateView) => void;
  onDelete: (t: MessageTemplateView) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex items-center gap-2">
          {lastSyncedAt && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Updated {new Date(lastSyncedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            <span className="sr-only sm:not-sr-only sm:ml-1.5">{TEMPLATES.refresh}</span>
          </Button>
          <Button type="button" size="sm" className="rounded-xl" onClick={onCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {TEMPLATES.newTemplate}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card py-20 text-sm text-muted-foreground">
          <GrowvisiSpinner size="sm" />
          {TEMPLATES.loading}
        </div>
      ) : isError ? (
        <QueryErrorState
          title={TEMPLATES.loadError}
          message={TEMPLATES.loadErrorHint}
          onRetry={onRetry}
        />
      ) : templates.length === 0 ? (
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
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={`${t.name}-${t.language}`}
              template={t}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
});
