"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { MetaAiNotice } from "@/components/dashboard/meta-ai-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CTA, EYEBROW } from "@/lib/brand-copy";
import { useAuthStore } from "@/stores/auth-store";
import { ArrowRight, Bot, LineChart, Sparkles, Target, UserRound, Zap } from "lucide-react";

const features = [
  {
    icon: LineChart,
    title: "Conversation classification",
    description: "Intent, sentiment, and stage detected on every inbound message.",
    href: "/dashboard/inbox",
    stat: "Live on ingest",
  },
  {
    icon: Target,
    title: "Lead scoring",
    description: "0–100 score so reps prioritize buyers ready to close.",
    href: "/dashboard/pipeline",
    stat: "Auto-updated",
  },
  {
    icon: Zap,
    title: "Auto stage updates",
    description: "Pipeline moves when buying intent or negotiation signals appear.",
    href: "/dashboard/pipeline",
    stat: "Proactive",
  },
  {
    icon: UserRound,
    title: "Human handoff flags",
    description: "Complex deals flagged for your team — Meta may still reply in-chat.",
    href: "/dashboard/insights",
    stat: "Team alerts",
  },
  {
    icon: Bot,
    title: "Lead timeline",
    description: "Full audit trail of AI decisions after each customer message.",
    href: "/dashboard/inbox",
    stat: "Per contact",
  },
];

export default function AiStudioPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: capabilities, isLoading } = useQuery({
    queryKey: ["conversation-capabilities"],
    queryFn: () =>
      apiFetch<{
        aiClassification: boolean;
        aiSuggestReply: boolean;
        primaryUseCase: string;
      }>("/conversations/capabilities", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: stats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{
        aiClassifications: number;
        classifiedLeads: number;
        humanHandoffRecommended: number;
      }>("/conversations/stats", { token: token ?? undefined }),
    enabled: !!token,
  });

  const isActive = capabilities?.aiClassification;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={EYEBROW.intelligence}
        title="Intelligence"
        description="Growvisi analyzes every WhatsApp thread — Meta replies in-chat, we track the revenue funnel."
        badge={
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
              isActive ? "bg-[#ecfdf5] text-accent" : "bg-amber-50 text-amber-700"
            }`}
          >
            {isLoading ? "…" : isActive ? "Active" : "Setup needed"}
          </span>
        }
      />

      <div className="mb-6">
        <MetaAiNotice />
      </div>

      <DashboardPanel
        noPadding
        className="mb-8 overflow-hidden border-accent/20 bg-gradient-to-br from-[#ecfdf5]/80 to-white"
        delay={0.05}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-4 w-64" />
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    {isActive ? "AI classification running" : "Set OPENAI_API_KEY to enable"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats
                      ? `${stats.aiClassifications} analyses · ${stats.classifiedLeads} scored · ${stats.humanHandoffRecommended} handoffs`
                      : "Runs on each inbound customer message."}
                  </p>
                </>
              )}
            </div>
          </div>
          <Button asChild className="rounded-xl">
            <Link href="/dashboard/inbox">{CTA.openConversations}</Link>
          </Button>
        </div>
      </DashboardPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
          >
            <Link href={f.href} className="card-interactive block h-full p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[#f8f9ff] px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {f.stat}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
