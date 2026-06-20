"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { PipelineBoard, type PipelineLead } from "@/components/dashboard/pipeline-board";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { PipelineSkeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { LeadStage } from "@growvisi/shared";

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
  NEW: "bg-blue-500",
  CONTACTED: "bg-violet-500",
  QUALIFIED: "bg-indigo-500",
  PROPOSAL: "bg-amber-500",
  NEGOTIATION: "bg-orange-500",
  WON: "bg-success",
  LOST: "bg-muted-foreground",
};

export default function PipelinePage() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

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

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const totalLeads = STAGES.reduce((sum, s) => sum + (data?.[s]?.length ?? 0), 0);

  return (
    <div className="dashboard-page flex h-full min-h-0 flex-col">
      <PageHeader
        eyebrow="Sales"
        title="Pipeline"
        description="Drag leads between stages on desktop, or use the stage picker on mobile."
      />

      {!hasWhatsapp && (
        <Card className="mb-6 border-dashed border-border/80 bg-muted/20">
          <CardContent className="p-2">
            <EmptyState
              compact
              title="Connect WhatsApp to build your pipeline"
              description="Leads are created automatically from customer conversations."
              actionHref="/dashboard/settings"
              actionLabel="Connect WhatsApp"
            />
          </CardContent>
        </Card>
      )}

      {isError && !isLoading && (
        <div className="mb-6">
          <QueryErrorState onRetry={() => void refetch()} />
        </div>
      )}

      {hasWhatsapp && !isLoading && !isError && totalLeads === 0 && (
        <Card className="mb-6 border-dashed border-border/80 bg-muted/20">
          <CardContent className="p-2">
            <EmptyState
              compact
              title="No leads yet"
              description="When someone messages your business on WhatsApp, they appear here automatically."
              actionHref="/dashboard/inbox"
              actionLabel="Go to Inbox"
            />
          </CardContent>
        </Card>
      )}

      {isLoading && <PipelineSkeleton />}

      {!isLoading && !isError && totalLeads > 0 && (
        <PipelineBoard
          stages={STAGES}
          stageLabels={STAGE_LABELS}
          stageColors={STAGE_COLORS}
          data={data}
          isPending={stageMutation.isPending}
          onMoveLead={(leadId, stage) => stageMutation.mutate({ leadId, stage })}
        />
      )}
    </div>
  );
}
