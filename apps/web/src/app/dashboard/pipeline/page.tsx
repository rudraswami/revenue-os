"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard, type PipelineLead } from "@/components/dashboard/pipeline-board";
import { DealValueDialog } from "@/components/dashboard/deal-value-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { PipelineSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiDownload, apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { CTA } from "@/lib/brand-copy";
import { QUERY_KEYS } from "@/lib/query-config";
import { useShellWhatsappAccounts } from "@/hooks/use-shell-data";
import { useAuthStore } from "@/stores/auth-store";
import { canExportContacts, canMoveLead } from "@/lib/permissions";
import type { LeadStage } from "@growvisi/shared";
import { Activity, Download, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LostReasonDialog } from "@/components/dashboard/lost-reason-dialog";
import { WonReasonDialog } from "@/components/dashboard/won-reason-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/toast";

const STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const STAGE_COLORS: Record<LeadStage, string> = {
  NEW: "bg-foreground/70",
  CONTACTED: "bg-accent/60",
  QUALIFIED: "bg-accent",
  PROPOSAL: "bg-accent-light",
  NEGOTIATION: "bg-warning",
  WON: "bg-accent",
  LOST: "bg-muted-foreground",
};

type PipelineFilter = "all" | "hot" | "stale" | "mine" | "unassigned";

const FILTER_OPTIONS: Array<{ value: PipelineFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "hot", label: "Hot" },
  { value: "stale", label: "Stale" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
];

interface PipelineResponse {
  grouped: Record<string, PipelineLead[]>;
  automationRunsToday: number;
  hasMoreByStage?: Record<string, boolean>;
  perStageLimit?: number;
}

interface PipelineSummary {
  totalLeads: number;
  pipelineValueCents: number;
  staleCount: number;
  staleValueCents: number;
  hotCount: number;
  avgDaysInStage: number | null;
  automationRunsToday: number;
  autoRepliedLeads: number;
}

function formatInr(cents: number) {
  if (cents <= 0) return "₹0";
  return `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function PipelinePage() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const myUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { error: toastError } = useToast();
  const canExport = canExportContacts(role);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<PipelineFilter>("all");
  const [lostPrompt, setLostPrompt] = useState<{ leadId: string; name?: string | null } | null>(
    null,
  );
  const [wonPrompt, setWonPrompt] = useState<{ leadId: string; name?: string | null } | null>(
    null,
  );
  const [valuePrompt, setValuePrompt] = useState<PipelineLead | null>(null);
  const [perStageLimit, setPerStageLimit] = useState(40);
  const [loadingMoreStage, setLoadingMoreStage] = useState<LeadStage | null>(null);

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "hot" || f === "stale" || f === "mine" || f === "unassigned") {
      setFilter(f);
    } else if (!f) {
      setFilter("all");
    }
  }, [searchParams]);

  const pipelineQueryKey = QUERY_KEYS.pipeline(filter, perStageLimit);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: pipelineQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      params.set("perStageLimit", String(perStageLimit));
      const qs = params.toString();
      return apiFetch<PipelineResponse>(`/leads/pipeline?${qs}`, {
        token: token ?? undefined,
      });
    },
    enabled: !!token,
    placeholderData: (prev) => prev,
  });

  const { data: summary } = useQuery({
    queryKey: QUERY_KEYS.pipelineSummary,
    queryFn: () =>
      apiFetch<PipelineSummary>("/leads/pipeline/summary", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    placeholderData: (prev) => prev,
  });

  const { data: whatsappAccounts } = useShellWhatsappAccounts();

  const grouped = data?.grouped;
  const hasMoreByStage = data?.hasMoreByStage;
  const automationRunsToday = data?.automationRunsToday ?? summary?.automationRunsToday ?? 0;

  function handleLoadMoreStage(stage: LeadStage) {
    if (loadingMoreStage) return;
    setLoadingMoreStage(stage);
    setPerStageLimit((n) => n + 40);
  }

  useEffect(() => {
    if (data) setLoadingMoreStage(null);
  }, [data]);

  const stageMutation = useMutation({
    mutationFn: ({
      leadId,
      stage,
      reason,
    }: {
      leadId: string;
      stage: LeadStage;
      reason?: string;
    }) =>
      apiFetch(`/leads/${leadId}/stage`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ stage, reason }),
      }),
    onMutate: async ({ leadId, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const previous = queryClient.getQueriesData<PipelineResponse>({ queryKey: ["pipeline"] });
      for (const [key, cached] of previous) {
        if (!cached?.grouped) continue;
        const next = { ...cached, grouped: { ...cached.grouped } };
        let movedLead: PipelineLead | undefined;
        for (const s of STAGES) {
          const col = [...(next.grouped[s] ?? [])];
          const idx = col.findIndex((l) => l.id === leadId);
          if (idx >= 0) {
            movedLead = { ...col[idx], stage };
            col.splice(idx, 1);
            next.grouped[s] = col;
          }
        }
        if (movedLead) {
          next.grouped[stage] = [...(next.grouped[stage] ?? []), movedLead];
        }
        queryClient.setQueryData(key, next);
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      context?.previous?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      const message =
        err instanceof ApiError ? toUserMessage(err) : "Could not move this deal. Try again.";
      toastError(message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      void queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["funnel-metrics"] });
    },
  });

  const valueMutation = useMutation({
    mutationFn: ({ leadId, valueCents }: { leadId: string; valueCents: number | null }) =>
      apiFetch(`/leads/${leadId}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ valueCents }),
      }),
    onMutate: async ({ leadId, valueCents }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const previous = queryClient.getQueriesData<PipelineResponse>({ queryKey: ["pipeline"] });
      for (const [key, cached] of previous) {
        if (!cached?.grouped) continue;
        const next = { ...cached, grouped: { ...cached.grouped } };
        for (const s of STAGES) {
          const col = next.grouped[s];
          if (!col) continue;
          const idx = col.findIndex((l) => l.id === leadId);
          if (idx >= 0) {
            const updated = [...col];
            updated[idx] = { ...updated[idx], valueCents };
            next.grouped[s] = updated;
          }
        }
        queryClient.setQueryData(key, next);
      }
      setValuePrompt(null);
      return { previous };
    },
    onError: (err, _vars, context) => {
      context?.previous?.forEach(([key, val]) => queryClient.setQueryData(key, val));
      toastError(err instanceof ApiError ? toUserMessage(err) : "Could not update deal value.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      void queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
    },
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const totalLeads = useMemo(
    () => STAGES.reduce((sum, s) => sum + (grouped?.[s]?.length ?? 0), 0),
    [grouped],
  );
  const workspaceLeadCount = summary?.totalLeads ?? totalLeads;

  async function handleExport() {
    if (!token || exporting) return;
    setExporting(true);
    try {
      await apiDownload("/leads/export?period=all", "growvisi-pipeline.csv", token);
    } finally {
      setExporting(false);
    }
  }

  const handleMoveLead = useCallback(
    (leadId: string, stage: LeadStage) => {
      const lead = STAGES.flatMap((s) => grouped?.[s] ?? []).find((l) => l.id === leadId);
      if (lead && !canMoveLead(role, myUserId, lead)) return;
      if (stage === "LOST") {
        setLostPrompt({ leadId, name: lead?.displayName });
        return;
      }
      if (stage === "WON") {
        setWonPrompt({ leadId, name: lead?.displayName });
        return;
      }
      stageMutation.mutate({ leadId, stage });
    },
    [grouped, role, myUserId, stageMutation],
  );

  const canMoveLeadFn = useCallback(
    (lead: PipelineLead) => canMoveLead(role, myUserId, lead),
    [role, myUserId],
  );

  return (
    <div className="dashboard-page flex h-full min-h-0 flex-col">
      <PageHeader
        title="Pipeline"
        description="Drag leads between stages — synced with WhatsApp conversations and AI scoring."
        action={
          canExport && (totalLeads > 0 || workspaceLeadCount > 0) ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          ) : undefined
        }
      />

      {!hasWhatsapp && (
        <DashboardPanel className="mb-6" delay={0.05}>
          <EmptyState
            compact
            title="Connect WhatsApp to build your pipeline"
            description="Leads are created automatically from customer conversations."
            actionHref="/onboarding"
            actionLabel="Connect WhatsApp"
          />
        </DashboardPanel>
      )}

      {isError && !isLoading && (
        <div className="mb-6">
          <QueryErrorState onRetry={() => void refetch()} />
        </div>
      )}

      {hasWhatsapp && !isLoading && !isError && workspaceLeadCount === 0 && (
        <DashboardPanel className="mb-6" delay={0.05}>
          <EmptyState
            compact
            title="No leads yet"
            description="When someone messages your business on WhatsApp, they appear here automatically."
            actionHref="/dashboard/inbox"
            actionLabel={CTA.openConversations}
          />
        </DashboardPanel>
      )}

      {isLoading && <PipelineSkeleton />}

      {hasWhatsapp && !isLoading && !isError && workspaceLeadCount > 0 && (
        <>
          {automationRunsToday > 0 && (
            <DashboardPanel className="mb-4 border-accent/20 bg-bento-mint/30" delay={0}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {automationRunsToday} automation{automationRunsToday > 1 ? "s" : ""} ran today
                    </p>
                    <p className="text-xs text-muted-foreground">
                      AI stage moves, alerts, and follow-up tasks are working in the background.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5" asChild>
                  <Link href="/dashboard/automations">
                    <Activity className="h-3.5 w-3.5" />
                    View log
                  </Link>
                </Button>
              </div>
            </DashboardPanel>
          )}

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Pipeline value"
              value={formatInr(summary?.pipelineValueCents ?? 0)}
              delay={0}
              highlight
            />
            <MetricCard
              title="Stale deals"
              value={summary?.staleCount ?? 0}
              delta={
                (summary?.staleValueCents ?? 0) > 0
                  ? `${formatInr(summary!.staleValueCents)} at risk`
                  : undefined
              }
              delay={0.05}
            />
            <MetricCard title="Hot leads" value={summary?.hotCount ?? 0} delay={0.1} />
            <MetricCard
              title="AI replied"
              value={summary?.autoRepliedLeads ?? 0}
              delta={
                (summary?.autoRepliedLeads ?? 0) > 0 && (summary?.totalLeads ?? 0) > 0
                  ? `${Math.round(((summary?.autoRepliedLeads ?? 0) / (summary?.totalLeads ?? 1)) * 100)}% of leads`
                  : undefined
              }
              delay={0.15}
            />
          </div>

          <div className="mb-4">
            <SegmentedControl
              aria-label="Pipeline filters"
              value={filter}
              onChange={setFilter}
              options={FILTER_OPTIONS}
            />
          </div>

          {filter !== "all" && totalLeads === 0 && (
            <p className="mb-4 text-sm text-muted-foreground">
              No leads match this filter.{" "}
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => setFilter("all")}
              >
                Show all
              </button>
            </p>
          )}

          <PipelineBoard
            stages={STAGES}
            stageLabels={STAGE_LABELS}
            stageColors={STAGE_COLORS}
            data={grouped}
            hasMoreByStage={hasMoreByStage}
            loadingMoreStage={loadingMoreStage}
            onLoadMoreStage={handleLoadMoreStage}
            isPending={stageMutation.isPending || valueMutation.isPending}
            onMoveLead={handleMoveLead}
            onEditValue={setValuePrompt}
            canMoveLead={canMoveLeadFn}
          />
        </>
      )}

      <LostReasonDialog
        open={!!lostPrompt}
        leadName={lostPrompt?.name}
        loading={stageMutation.isPending}
        onCancel={() => setLostPrompt(null)}
        onConfirm={(reason) => {
          if (!lostPrompt) return;
          stageMutation.mutate(
            { leadId: lostPrompt.leadId, stage: "LOST", reason },
            { onSuccess: () => setLostPrompt(null) },
          );
        }}
      />
      <WonReasonDialog
        open={!!wonPrompt}
        leadName={wonPrompt?.name}
        loading={stageMutation.isPending}
        onCancel={() => setWonPrompt(null)}
        onConfirm={(reason) => {
          if (!wonPrompt) return;
          stageMutation.mutate(
            { leadId: wonPrompt.leadId, stage: "WON", reason },
            { onSuccess: () => setWonPrompt(null) },
          );
        }}
      />
      <DealValueDialog
        key={valuePrompt?.id ?? "closed"}
        open={!!valuePrompt}
        leadName={valuePrompt?.displayName}
        currentValueCents={valuePrompt?.valueCents ?? null}
        loading={valueMutation.isPending}
        onCancel={() => setValuePrompt(null)}
        onConfirm={(valueCents) => {
          if (!valuePrompt) return;
          valueMutation.mutate({ leadId: valuePrompt.id, valueCents });
        }}
      />
    </div>
  );
}
