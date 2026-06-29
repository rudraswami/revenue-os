"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CTA, CONVERSATIONS, EYEBROW } from "@/lib/brand-copy";
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
    title: `${CONVERSATIONS.yourTurn} alerts`,
    description: "When AI can't answer alone, the thread lands in your queue — you reply as a person.",
    href: "/dashboard/inbox?filter=handoff",
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

  const { data: activityFeed } = useQuery({
    queryKey: ["intelligence-activity"],
    queryFn: () =>
      apiFetch<Array<{ type: string; time: string; data: Record<string, unknown> }>>(
        "/leads/activity",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: 30_000,
  });

  const { data: knowledgeDocs } = useQuery({
    queryKey: ["knowledge-documents"],
    queryFn: () =>
      apiFetch<Array<{ status: string; chunkCount?: number }>>("/knowledge/documents", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    retry: false,
  });

  const recentClassifications = (activityFeed ?? [])
    .filter((a) => a.type === "ai_classification")
    .slice(0, 6);

  const ragChunks = (knowledgeDocs ?? []).reduce((n, d) => n + (d.chunkCount ?? 0), 0);
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
                    {isActive ? "Intelligence is active" : "Intelligence is being set up"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isActive
                      ? stats
                        ? `${stats.aiClassifications} total analyses · ${stats.classifiedLeads} scored · ${stats.humanHandoffRecommended} waiting on you`
                        : "Runs on each inbound customer message."
                      : "Classification will start automatically once your workspace is fully configured. Need help? Use AI Support (bottom-left)."}
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

      {/* Capabilities + RAG status */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="What AI does" description="Classifies and advises — your team sends human replies from Inbox. Growvisi never auto-messages customers.">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Classification:</strong>{" "}
              {capabilities?.aiClassification
                ? "On — runs on every inbound message"
                : "Setting up — contact support@growvisi.in if this persists after WhatsApp is connected"}
            </li>
            <li>
              <strong className="text-foreground">{CONVERSATIONS.yourTurn}:</strong> Flags chats that need a real reply — use {CONVERSATIONS.replyNow} in Conversations
            </li>
            <li>
              <strong className="text-foreground">Smart reply drafts:</strong>{" "}
              {capabilities?.aiSuggestReply ? "On — suggestions when you compose a reply" : "Off"}
            </li>
            <li>
              <strong className="text-foreground">Business context (RAG):</strong>{" "}
              {ragChunks > 0
                ? `${ragChunks} knowledge chunks indexed for classify + suggest`
                : "Add docs in Settings → Business context"}
            </li>
          </ul>
        </DashboardPanel>

        <DashboardPanel
          title="Recent classifications"
          description="Live explainers from your workspace — not marketing claims."
        >
          {recentClassifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classifications yet. They appear here as customers message on WhatsApp.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentClassifications.map((item, i) => {
                const d = item.data;
                const name = String(d.contactName ?? d.leadName ?? "Lead");
                const intent = String(d.intent ?? "Inquiry");
                const summary = typeof d.summary === "string" ? d.summary : null;
                const next =
                  typeof d.nextAction === "string" ? d.nextAction : null;
                return (
                  <li key={`${item.time}-${i}`} className="rounded-xl border border-border/70 bg-[#f8f9ff]/50 p-3">
                    <p className="text-sm font-semibold">
                      {name} — <span className="text-accent">{intent}</span>
                    </p>
                    {summary && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{summary}</p>
                    )}
                    {next && (
                      <p className="mt-1 text-xs font-medium text-accent">Next: {next}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardPanel>
      </div>

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
