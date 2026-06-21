"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PipelineBoard, type PipelineLead } from "@/components/dashboard/pipeline-board";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { PipelineSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiDownload, apiFetch } from "@/lib/api-client";
import { CTA } from "@/lib/brand-copy";
import { useAuthStore } from "@/stores/auth-store";
import type { LeadStage } from "@growvisi/shared";
import { Download } from "lucide-react";
import { useState } from "react";

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
  NEW: "bg-[#0b1c30]/70",
  CONTACTED: "bg-[#006c49]/60",
  QUALIFIED: "bg-accent",
  PROPOSAL: "bg-[#4edea3]",
  NEGOTIATION: "bg-amber-500",
  WON: "bg-accent",
  LOST: "bg-muted-foreground",
};

export default function PipelinePage() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () =>
      apiFetch<Record<string, PipelineLead[]>>("/leads/pipeline", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: whatsappAccounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const stageMutation = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: LeadStage }) =>
      apiFetch(`/leads/${leadId}/stage`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ stage }),
      }),
    onMutate: async ({ leadId, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const previous = queryClient.getQueryData<Record<string, PipelineLead[]>>(["pipeline"]);
      if (previous) {
        const next = { ...previous };
        let movedLead: PipelineLead | undefined;
        for (const s of STAGES) {
          const col = [...(next[s] ?? [])];
          const idx = col.findIndex((l) => l.id === leadId);
          if (idx >= 0) {
            movedLead = { ...col[idx], stage };
            col.splice(idx, 1);
            next[s] = col;
          }
        }
        if (movedLead) {
          next[stage] = [...(next[stage] ?? []), movedLead];
        }
        queryClient.setQueryData(["pipeline"], next);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["pipeline"], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const totalLeads = STAGES.reduce((sum, s) => sum + (data?.[s]?.length ?? 0), 0);
  const wonCount = data?.WON?.length ?? 0;
  const hotCount = STAGES.flatMap((s) => data?.[s] ?? []).filter((l) => l.score >= 80).length;

  async function handleExport() {
    if (!token || exporting) return;
    setExporting(true);
    try {
      await apiDownload("/leads/export?period=all", "growvisi-leads.csv", token);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="dashboard-page flex h-full min-h-0 flex-col">
      <PageHeader
        eyebrow="Sales"
        title="Pipeline"
        description="Drag leads between stages — synced with WhatsApp conversations and AI scoring."
        action={
          totalLeads > 0 ? (
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

      {hasWhatsapp && !isLoading && !isError && totalLeads === 0 && (
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

      {!isLoading && !isError && totalLeads > 0 && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <MetricCard title="Total leads" value={totalLeads} delay={0} />
            <MetricCard title="Won" value={wonCount} highlight delay={0.05} />
            <MetricCard title="Hot leads (80+)" value={hotCount} delay={0.1} />
          </div>
          <PipelineBoard
          stages={STAGES}
          stageLabels={STAGE_LABELS}
          stageColors={STAGE_COLORS}
          data={data}
          isPending={stageMutation.isPending || valueMutation.isPending}
          onMoveLead={(leadId, stage) => stageMutation.mutate({ leadId, stage })}
          onUpdateValue={(leadId, valueCents) => valueMutation.mutate({ leadId, valueCents })}
        />
        </>
      )}
    </div>
  );
}
