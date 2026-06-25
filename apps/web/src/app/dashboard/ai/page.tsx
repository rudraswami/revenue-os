"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CTA, EYEBROW } from "@/lib/brand-copy";
import { useAuthStore } from "@/stores/auth-store";
import {
  Activity,
  ArrowRight,
  Bot,
  Clock,
  LineChart,
  Sparkles,
  Tag,
  Target,
  UserRound,
  Zap,
} from "lucide-react";

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
    title: "Conversation summaries",
    description: "AI generates a summary of every conversation, stored per lead.",
    href: "/dashboard/contacts",
    stat: "Per contact",
  },
  {
    icon: Tag,
    title: "Auto-tagging",
    description: "AI extracts relevant tags from conversations and assigns them to leads automatically.",
    href: "/dashboard/contacts",
    stat: "Automatic",
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

  const { data: agentStatus } = useQuery({
    queryKey: ["agent-status"],
    queryFn: () =>
      apiFetch<{
        classificationsToday: number;
        automationsToday: number;
        lastClassifiedAt: string | null;
        lastLatencyMs: number | null;
        lastSummary: string | null;
      }>("/leads/agent-status", { token: token ?? undefined }),
    enabled: !!token,
  });

  const isActive = capabilities?.aiClassification;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={EYEBROW.intelligence}
        title="Intelligence"
        description="Your AI revenue agent — classifying, scoring, tagging, and routing leads automatically."
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

      {/* Agent status hero card */}
      <DashboardPanel
        noPadding
        className="mb-8 overflow-hidden border-accent/20 bg-gradient-to-br from-[#ecfdf5]/80 to-white"
        delay={0.05}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-4 w-64" />
                </>
              ) : (
                <>
                  <p className="text-lg font-bold">
                    {isActive ? "AI Revenue Agent running" : "Set OPENAI_API_KEY to enable"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats
                      ? `${stats.aiClassifications} total analyses · ${stats.classifiedLeads} scored · ${stats.humanHandoffRecommended} handoffs`
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

      {/* Agent metrics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid gap-4 sm:grid-cols-3"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{agentStatus?.classificationsToday ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Classifications today</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{agentStatus?.automationsToday ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">Automations triggered</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {agentStatus?.lastLatencyMs ? `${(agentStatus.lastLatencyMs / 1000).toFixed(1)}s` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">Last response time</p>
          </div>
        </div>
      </motion.div>

      {/* Latest summary */}
      {agentStatus?.lastSummary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <DashboardPanel noPadding className="border-accent/20 bg-gradient-to-r from-bento-mint/30 to-white">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-accent" />
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Latest AI conversation summary</p>
              </div>
              <p className="text-sm leading-relaxed">{agentStatus.lastSummary}</p>
            </div>
          </DashboardPanel>
        </motion.div>
      )}

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.05 }}
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
