"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  type AutomationId,
  DEFAULT_AUTOMATIONS,
} from "@/lib/automation-preferences";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Bell, Clock, MessageCircle, Zap } from "lucide-react";

const SERVER_AUTOMATIONS: Array<{
  id: Exclude<AutomationId, "welcome">;
  icon: typeof MessageCircle;
  title: string;
  description: string;
  impact: string;
  serverNote: string;
}> = [
  {
    id: "followup",
    icon: Clock,
    title: "Follow-up reminder",
    description: "Email your team when a conversation has waited 24+ hours without a reply.",
    impact: "Fewer dropped leads",
    serverNote: "Daily email when enabled",
  },
  {
    id: "stage",
    icon: Zap,
    title: "Auto stage update",
    description: "Let AI move leads forward when classification confidence is high.",
    impact: "Cleaner pipeline",
    serverNote: "Runs on each classification",
  },
  {
    id: "notify",
    icon: Bell,
    title: "Hot lead alert",
    description: "Email owners when a lead score hits 80 or higher.",
    impact: "Close faster",
    serverNote: "Email alert when enabled",
  },
];

export default function AutomationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data: toggles, isLoading } = useQuery({
    queryKey: ["automation-preferences"],
    queryFn: () => apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    initialData: DEFAULT_AUTOMATIONS,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<Record<AutomationId, boolean>>) =>
      apiFetch<Record<AutomationId, boolean>>("/automations/preferences", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["automation-preferences"], data);
    },
  });

  function toggle(id: AutomationId, enabled: boolean) {
    mutation.mutate({ [id]: enabled });
  }

  const activeCount = Object.entries(toggles ?? DEFAULT_AUTOMATIONS)
    .filter(([id, on]) => id !== "welcome" && on)
    .length;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Workflows"
        title="Automations"
        description="Server-side workflows that help your team close faster — saved per workspace."
        badge={
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-bold text-accent">
            {activeCount} active
          </span>
        }
        action={
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/dashboard/ai">Intelligence</Link>
          </Button>
        }
      />

      <DashboardPanel
        noPadding
        className="mb-8 border-accent/20 bg-gradient-to-r from-bento-mint/40 to-white"
        delay={0.05}
      >
        <div className="p-5 text-sm">
          <p className="font-semibold">What runs automatically</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Stage updates and hot-lead alerts fire when AI classifies messages. Follow-up reminders
            run once daily via scheduled job.
          </p>
        </div>
      </DashboardPanel>

      {mutation.isError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Couldn&apos;t save that change. Please try again.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {SERVER_AUTOMATIONS.map((a) => (
            <div key={a.id} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <DashboardPanel noPadding className="border-accent/20 bg-gradient-to-r from-bento-mint/30 to-white">
            <div className="flex flex-row items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold">Welcome & first reply</h3>
                  <span className="rounded-full bg-[#f8f9ff] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Meta Business Agent
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  First replies happen inside WhatsApp via Meta — Growvisi classifies intent from the
                  full thread. No toggle needed here.
                </p>
                <p className="mt-2 text-xs font-medium text-accent">Always on via WhatsApp</p>
              </div>
            </div>
          </DashboardPanel>

          {SERVER_AUTOMATIONS.map((auto, i) => {
            const enabled = toggles?.[auto.id] ?? DEFAULT_AUTOMATIONS[auto.id];
            return (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <DashboardPanel noPadding className={enabled ? "border-accent/25 ring-1 ring-accent/10" : ""}>
                <div className="flex flex-row items-start gap-4 p-5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      enabled ? "bg-accent text-white" : "bg-[#ecfdf5] text-accent"
                    }`}
                  >
                    <auto.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{auto.title}</h3>
                      <span className="rounded-full bg-[#f8f9ff] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {auto.impact}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{auto.description}</p>
                    <p className="mt-2 text-xs font-medium text-accent">
                      {enabled ? auto.serverNote : "Off"}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={mutation.isPending}
                    onCheckedChange={(v) => toggle(auto.id, v)}
                    aria-label={`${auto.title} automation`}
                  />
                </div>
              </DashboardPanel>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
