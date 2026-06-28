"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, ExternalLink, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { InboxThreadSkeleton } from "@/components/ui/skeleton";
import { formatStage } from "@/lib/stage-labels";
import { LEAD_STAGES, STAGE_LABELS, STAGE_BADGE, formatInr } from "@/lib/crm";
import type { LeadStage } from "@growvisi/shared";
import { CONVERSATIONS, type InboxListFilter } from "@/lib/brand-copy";
import { InboxConversationList } from "@/components/dashboard/inbox-conversation-list";
import { InboxAiPanel, type InboxAiContext } from "@/components/dashboard/inbox-ai-panel";
import { OutboundCompose } from "@/components/dashboard/outbound-compose";
import { InboxMessageBody } from "@/components/dashboard/inbox-message-body";
import { InboxComposer } from "@/components/dashboard/inbox-composer";
import { InboxTimeline } from "@/components/dashboard/inbox-timeline";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canWrite } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface ConversationRow {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastMessageAt: string | null;
  requiresHuman?: boolean;
  lead: { id: string; stage: string } | null;
  messages: Array<{ content: string | null }>;
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content: string | null;
  createdAt: string;
  status: string;
}

interface ConversationDetail {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  aiEnabled: boolean;
  requiresHuman?: boolean;
  handoffReason?: string | null;
  aiContext?: InboxAiContext | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  lead: { id: string; stage: string; score?: number; aiConfidence?: number | null; valueCents?: number | null } | null;
  messages: Message[];
  whatsappAccount: { displayPhoneNumber: string; isActive: boolean };
}

interface TeamMember {
  user: { id: string; name: string | null; email: string };
}

interface TimelineEvent {
  id: string;
  type: "stage_change" | "ai_classify" | "automation";
  at: string;
  title: string;
  detail?: string;
}

interface LeadTimeline {
  lead: {
    id: string;
    stage: string;
    score: number;
    aiConfidence: number | null;
    lastClassifiedAt: string | null;
  };
  events: TimelineEvent[];
}

export default function InboxPage() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const myUserId = useAuthStore((s) => s.user?.id);
  const canSend = canWrite(role);
  const queryClient = useQueryClient();
  const { connected: live } = useRealtime();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showOutbound, setShowOutbound] = useState(false);
  const [listFilter, setListFilter] = useState<InboxListFilter>("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) setSelectedId(c);
    const f = params.get("filter");
    if (f === "handoff" || f === "unread" || f === "unassigned") {
      setListFilter(f);
    }

    function onPopState() {
      const p = new URLSearchParams(window.location.search);
      setSelectedId(p.get("c"));
      const filter = p.get("filter");
      setListFilter(
        filter === "handoff" || filter === "unread" || filter === "unassigned"
          ? filter
          : "all",
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const { data: listData, isLoading: listLoading, isError: listError, refetch: refetchList } = useQuery({
    queryKey: ["conversations", searchDebounced, listFilter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (searchDebounced) params.set("q", searchDebounced);
      if (listFilter !== "all") params.set("filter", listFilter);
      return apiFetch<{ data: ConversationRow[] }>(`/conversations?${params}`, {
        token: token ?? undefined,
      });
    },
    enabled: !!token,
    refetchInterval: live ? 5_000 : 8_000,
  });

  const { data: convStats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ humanHandoffRecommended: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 30_000,
  });

  const { data: whatsappAccounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;

  const { data: thread, isLoading: threadLoading, isError: threadError, refetch: refetchThread } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () =>
      apiFetch<ConversationDetail>(`/conversations/${selectedId}`, { token: token ?? undefined }),
    enabled: !!token && !!selectedId,
    refetchInterval: live ? false : 8_000,
  });

  const leadId = thread?.lead?.id;

  const { data: timeline } = useQuery({
    queryKey: ["lead-timeline", leadId],
    queryFn: () =>
      apiFetch<LeadTimeline>(`/leads/${leadId}/timeline`, { token: token ?? undefined }),
    enabled: !!token && !!leadId,
    refetchInterval: live ? false : 12_000,
  });

  const { data: capabilities } = useQuery({
    queryKey: ["conversation-capabilities"],
    queryFn: () =>
      apiFetch<{ aiSuggestReply: boolean }>("/conversations/capabilities", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 300_000,
  });

  const { data: replyTemplates } = useQuery({
    queryKey: ["reply-templates"],
    queryFn: () =>
      apiFetch<{ templates: Array<{ id: string; title: string; body: string }> }>(
        "/organizations/reply-templates",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: 120_000,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => apiFetch<TeamMember[]>("/organizations/members", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 120_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  useEffect(() => {
    if (thread?.requiresHuman && showComposer) {
      composeRef.current?.focus();
    }
  }, [thread?.requiresHuman, thread?.id, showComposer]);

  const suggestMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ suggestion: string }>(`/conversations/${selectedId}/suggest-reply`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: (res) => {
      setDraft(res.suggestion);
      setSendError(null);
    },
    onError: (e) => {
      setSendError(e instanceof ApiError ? e.message : "Could not suggest a reply.");
    },
  });

  const aiToggleMutation = useMutation({
    mutationFn: (aiEnabled: boolean) =>
      apiFetch<ConversationDetail>(`/conversations/${selectedId}/ai`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ aiEnabled }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["conversation", selectedId], updated);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assignToUserId: string | null) =>
      apiFetch<ConversationDetail>(`/conversations/${selectedId}/assign`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ assignToUserId }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["conversation", selectedId], updated);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const stageMutation = useMutation({
    mutationFn: (stage: LeadStage) =>
      apiFetch(`/leads/${thread?.lead?.id}/stage`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ stage, reason: "Updated from Conversations" }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (leadId) void queryClient.invalidateQueries({ queryKey: ["lead-timeline", leadId] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) =>
      apiFetch("/tasks", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          title: title.slice(0, 120),
          priority: "HIGH",
          leadId: thread?.lead?.id,
          assignedToId: myUserId,
        }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const resolveHandoffMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/conversations/${selectedId}/resolve-handoff`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: (taskTitle?: string) =>
      apiFetch<ConversationDetail>(`/conversations/${selectedId}/takeover`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ taskTitle }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["conversation", selectedId], updated);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch(`/conversations/${selectedId}/messages`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setDraft("");
      setSendError(null);
      void queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation-stats"] });
    },
    onError: (e) => {
      setSendError(e instanceof ApiError ? e.message : "Message could not be sent.");
    },
  });

  const conversations = listData?.data ?? [];

  function selectConversation(id: string) {
    setSelectedId(id);
    setSendError(null);
    setShowComposer(true);
    const params = new URLSearchParams(window.location.search);
    params.set("c", id);
    window.history.replaceState(null, "", `/dashboard/inbox?${params.toString()}`);
    void apiFetch(`/conversations/${id}/read`, {
      method: "POST",
      token: token ?? undefined,
    }).catch(() => {});
  }

  function setInboxFilter(filter: InboxListFilter) {
    setListFilter(filter);
    const params = new URLSearchParams(window.location.search);
    if (filter !== "all") params.set("filter", filter);
    else params.delete("filter");
    const q = params.toString();
    window.history.replaceState(null, "", q ? `/dashboard/inbox?${q}` : "/dashboard/inbox");
  }

  function clearSelection() {
    setSelectedId(null);
    setSendError(null);
    window.history.replaceState(null, "", "/dashboard/inbox");
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-row overflow-hidden rounded-xl border border-border/80 bg-white shadow-[0_2px_16px_rgb(11_28_48/0.05)] max-lg:rounded-none max-lg:border-0 lg:mx-4 lg:mb-4 lg:mt-2">
      {/* Conversation list — always visible on md+; mobile shows list OR thread */}
      <div className={cn("h-full shrink-0", selectedId ? "max-md:hidden" : "flex", "md:flex")}>
        <InboxConversationList
          conversations={conversations}
          selectedId={selectedId}
          search={search}
          onSearchChange={setSearch}
          hasWhatsapp={hasWhatsapp}
          live={live}
          listLoading={listLoading}
          listError={listError}
          onRetry={() => void refetchList()}
          onSelect={selectConversation}
          onNewMessage={canSend && hasWhatsapp ? () => setShowOutbound(true) : undefined}
          listFilter={listFilter}
          onListFilterChange={setInboxFilter}
          yourTurnCount={convStats?.humanHandoffRecommended}
        />
      </div>

      {/* Thread + timeline — always visible on md+ */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-[#f8f9ff]/40",
          selectedId ? "flex" : "max-md:hidden",
          "md:flex",
        )}
      >
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-border/80">
              <Inbox className="h-7 w-7 text-accent" />
            </div>
            <div className="max-w-sm space-y-1">
              <h2 className="text-lg font-bold tracking-tight">{CONVERSATIONS.selectTitle}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {CONVERSATIONS.selectBody}
              </p>
            </div>
            <div className="mt-2 grid max-w-md gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3">
              <div className="rounded-xl border border-border/80 bg-white px-3 py-2.5">
                <p className="font-semibold text-foreground">Thread</p>
                <p className="mt-0.5">Full message history</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-white px-3 py-2.5">
                <p className="font-semibold text-foreground">AI & owner</p>
                <p className="mt-0.5">Classify and assign</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-white px-3 py-2.5">
                <p className="font-semibold text-foreground">Timeline</p>
                <p className="mt-0.5">Stage & automation log</p>
              </div>
            </div>
          </div>
        ) : threadLoading && !thread ? (
          <InboxThreadSkeleton />
        ) : threadError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-destructive">Could not load this conversation.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void refetchThread()}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => clearSelection()}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Back to list
              </button>
            </div>
          </div>
        ) : thread ? (
          <div className="flex min-h-0 flex-1 min-w-0">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Thread header */}
            <div className="shrink-0 border-b border-border/80 bg-white">
              <div className="flex items-center gap-3 px-4 py-3 lg:px-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 md:hidden"
                  onClick={clearSelection}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <AvatarInitials name={thread.contactName ?? thread.contactPhone} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {thread.contactName ?? thread.contactPhone}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate">{thread.contactPhone}</span>
                    {thread.lead && (() => {
                      const lead = thread.lead;
                      const hasValue = lead.valueCents != null && lead.valueCents > 0;
                      const closed = lead.stage === "WON" || lead.stage === "LOST";
                      const pipelineHref = `/dashboard/pipeline?lead=${lead.id}`;

                      if (hasValue) {
                        const label =
                          lead.stage === "WON"
                            ? CONVERSATIONS.dealClosed(formatInr(lead.valueCents))
                            : CONVERSATIONS.dealValue(formatInr(lead.valueCents));
                        return (
                          <>
                            <span aria-hidden className="text-border">·</span>
                            <Link
                              href={pipelineHref}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition hover:underline",
                                lead.stage === "WON"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-[#f8f9ff] text-foreground",
                              )}
                              title="Deal ₹ tracked on Pipeline — tap to view or edit"
                            >
                              {label}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                            </Link>
                          </>
                        );
                      }

                      if (!closed) {
                        return (
                          <>
                            <span aria-hidden className="text-border">·</span>
                            <Link
                              href={pipelineHref}
                              className="font-medium text-muted-foreground hover:text-accent hover:underline"
                            >
                              {CONVERSATIONS.addDealValue}
                            </Link>
                          </>
                        );
                      }

                      return (
                        <>
                          <span aria-hidden className="text-border">·</span>
                          <Link
                            href={pipelineHref}
                            className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
                          >
                            {CONVERSATIONS.viewOnPipeline}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {thread.lead?.score != null && thread.lead.score > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        thread.lead.score >= 80
                          ? "bg-accent text-white"
                          : "bg-[#ecfdf5] text-accent",
                      )}
                      title="Lead score from AI"
                    >
                      {thread.lead.score >= 80
                        ? CONVERSATIONS.scoreHot(thread.lead.score)
                        : CONVERSATIONS.scoreWarm(thread.lead.score)}
                    </span>
                  )}
                  {thread.lead && (
                    canSend ? (
                      <select
                        className={cn(
                          "max-w-[110px] truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          STAGE_BADGE[thread.lead.stage as LeadStage] ?? "bg-primary-soft text-accent",
                        )}
                        value={thread.lead.stage}
                        disabled={stageMutation.isPending}
                        onChange={(e) => stageMutation.mutate(e.target.value as LeadStage)}
                      >
                        {LEAD_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                          STAGE_BADGE[thread.lead.stage as LeadStage],
                        )}
                      >
                        {formatStage(thread.lead.stage)}
                      </span>
                    )
                  )}
                  {thread.requiresHuman && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      {CONVERSATIONS.waitingOnYou}
                    </span>
                  )}
                </div>
              </div>
              <InboxAiPanel
                aiContext={thread.aiContext ?? null}
                requiresHuman={thread.requiresHuman}
                handoffReason={thread.handoffReason}
                canEdit={canSend}
                takeoverPending={takeoverMutation.isPending}
                taskPending={createTaskMutation.isPending}
                assignPending={assignMutation.isPending}
                resolvePending={resolveHandoffMutation.isPending}
                onTakeover={(title) => {
                  const t =
                    title ||
                    thread.aiContext?.nextAction ||
                    `Follow up: ${thread.contactName ?? thread.contactPhone}`;
                  takeoverMutation.mutate(t);
                }}
                onCreateTask={(title) => {
                  const t =
                    title ||
                    thread.aiContext?.nextAction ||
                    `Follow up: ${thread.contactName ?? thread.contactPhone}`;
                  createTaskMutation.mutate(t);
                }}
                onAssignToMe={() => {
                  if (myUserId) assignMutation.mutate(myUserId);
                }}
                onResolveHandoff={() => resolveHandoffMutation.mutate()}
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-[#f8f9ff]/60 px-4 py-2 lg:px-5">
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-white px-2.5 py-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {CONVERSATIONS.autoClassify}
                  </span>
                  <span className="scale-90">
                    <Switch
                      checked={thread.aiEnabled}
                      disabled={aiToggleMutation.isPending}
                      onCheckedChange={(v) => aiToggleMutation.mutate(v)}
                      aria-label={CONVERSATIONS.autoClassify}
                    />
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-white px-2.5 py-1.5">
                  <label htmlFor="assign-agent" className="text-[10px] font-medium text-muted-foreground">
                    {CONVERSATIONS.assignedTo}
                  </label>
                  <select
                    id="assign-agent"
                    className="max-w-[120px] truncate rounded-md border-0 bg-transparent text-xs font-medium focus:outline-none"
                    value={thread.assignedTo?.id ?? ""}
                    disabled={assignMutation.isPending}
                    onChange={(e) => {
                      const v = e.target.value;
                      assignMutation.mutate(v ? v : null);
                    }}
                  >
                    <option value="">{CONVERSATIONS.unassigned}</option>
                    {(teamMembers ?? []).map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name ?? m.user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {live ? "Live" : "Syncing"}
                </span>
              </div>
            </div>

            <div className="conversation-thread-bg flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 custom-scrollbar lg:px-6">
              <div className="mx-auto mt-auto flex w-full max-w-xl flex-col gap-2.5">
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed shadow-sm",
                      m.direction === "OUTBOUND"
                        ? "ml-auto rounded-br-md border border-emerald-200/60 bg-[#d9fdd3] text-foreground"
                        : "mr-auto rounded-bl-md border border-white/80 bg-white text-foreground",
                    )}
                  >
                    <InboxMessageBody
                      conversationId={thread.id}
                      messageId={m.id}
                      type={m.type ?? "TEXT"}
                      content={m.content}
                    />
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        m.direction === "OUTBOUND" ? "text-emerald-800/60" : "text-muted-foreground",
                      )}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-border/80 bg-[#f8f9ff]/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-5">
              <div className="mx-auto max-w-xl">
                {showComposer ? (
                  <InboxComposer
                    draft={draft}
                    onDraftChange={setDraft}
                    onSend={handleSend}
                    sendPending={sendMutation.isPending}
                    sendDisabled={!thread.whatsappAccount.isActive}
                    sendError={sendError}
                    showAiSuggest={!!capabilities?.aiSuggestReply}
                    suggestPending={suggestMutation.isPending}
                    onSuggest={() => suggestMutation.mutate()}
                    templates={replyTemplates?.templates}
                    composeRef={composeRef}
                    onMinimize={() => setShowComposer(false)}
                  />
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-accent/30 hover:bg-[#ecfdf5]/30"
                    onClick={() => setShowComposer(true)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {CONVERSATIONS.composeTitle}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {CONVERSATIONS.composeFooter}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-white">
                      <ChevronUp className="h-3.5 w-3.5" />
                      Open
                    </span>
                  </button>
                )}
              </div>
            </div>
            </div>

            {thread.lead && (
              <InboxTimeline
                className="hidden lg:flex"
                events={timeline?.events ?? []}
                aiConfidence={timeline?.lead.aiConfidence}
                hasClassification={!!thread.aiContext}
                open={showTimeline}
                onToggle={() => setShowTimeline((v) => !v)}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
    <OutboundCompose
      open={showOutbound}
      onClose={() => setShowOutbound(false)}
      onSent={(id) => selectConversation(id)}
    />
    </>
  );
}
