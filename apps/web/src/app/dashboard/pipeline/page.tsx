"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { LeadStage } from "@growthsync/shared";

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

interface PipelineLead {
  id: string;
  displayName: string | null;
  phone: string;
  score: number;
  stage: LeadStage;
  conversation: { id: string } | null;
}

export default function PipelinePage() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () =>
      apiFetch<Record<string, PipelineLead[]>>("/leads/pipeline", { token: token ?? undefined }),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      void queryClient.invalidateQueries({ queryKey: ["funnel-metrics"] });
    },
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const totalLeads = STAGES.reduce((sum, s) => sum + (data?.[s]?.length ?? 0), 0);

  return (
    <div className="flex h-full flex-col p-6 md:p-8">
      <PageHeader
        title="Pipeline"
        description="Track customers from first message to closed deal"
      />

      {!hasWhatsapp && (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <p className="text-sm text-muted-foreground">Connect WhatsApp to build your pipeline from real conversations.</p>
            <Button asChild size="sm">
              <Link href="/dashboard/settings">Connect WhatsApp</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasWhatsapp && !isLoading && totalLeads === 0 && (
        <Card className="mb-6 border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No leads yet</p>
            <p className="mt-1">When someone messages your business on WhatsApp, they appear here automatically.</p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/dashboard/inbox">Go to Inbox</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading pipeline…</p>}

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[272px] shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", STAGE_COLORS[stage])} />
              <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]}</h2>
              <span className="ml-auto rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
                {data?.[stage]?.length ?? 0}
              </span>
            </div>
            <div className="min-h-[200px] space-y-2 rounded-xl bg-muted/50 p-2">
              {(data?.[stage] ?? []).map((lead) => (
                <Card key={lead.id}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">{lead.displayName ?? lead.phone}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    <select
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={lead.stage}
                      disabled={stageMutation.isPending}
                      onChange={(e) => {
                        const next = e.target.value as LeadStage;
                        if (next !== lead.stage) {
                          stageMutation.mutate({ leadId: lead.id, stage: next });
                        }
                      }}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    {lead.conversation?.id ? (
                      <Link
                        href={`/dashboard/inbox?c=${lead.conversation.id}`}
                        className="block text-xs text-primary hover:underline"
                      >
                        Open chat
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">No chat linked</span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
