"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, ExternalLink, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { InboxThreadSkeleton } from "@/components/ui/skeleton";
import { LEAD_STAGES, STAGE_BADGE, formatInr } from "@/lib/crm";
import { HOT_LEAD_SCORE_THRESHOLD, formatRelationshipPhase, type LeadStage, type ReplyDecision } from "@growvisi/shared";
import {
  useConversationsCopy,
  type InboxListFilter,
  type InboxListScope,
} from "@/lib/i18n/conversations-copy";
import { InboxConversationList } from "@/components/dashboard/inbox-conversation-list";
import { InboxAiPanel, type InboxAiContext } from "@/components/dashboard/inbox-ai-panel";
import type { AssignmentExplain } from "@/lib/assignment-explain";
import { trackCoaching } from "@/lib/coaching-analytics";
import { OutboundCompose } from "@/components/dashboard/outbound-compose";
import { InboxMessageBody } from "@/components/dashboard/inbox-message-body";
import { InboxComposer } from "@/components/dashboard/inbox-composer";
import { InboxReplyDecision } from "@/components/dashboard/inbox-reply-decision";
import { InboxTimeline } from "@/components/dashboard/inbox-timeline";
import { LostReasonDialog } from "@/components/dashboard/lost-reason-dialog";
import { WonReasonDialog } from "@/components/dashboard/won-reason-dialog";
import { InboxThreadDetailsMobile } from "@/components/dashboard/inbox-thread-details-mobile";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { canAssignToSelf, canAssignWork, canManageTeam, canToggleInboxAi, canWrite } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  pickDailyQueueFilter,
  trackQueue,
} from "@/lib/conversation-queue-analytics";

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
  sentByAi?: boolean;
}

interface ConversationDetail {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastInboundAt?: string | null;
  aiEnabled: boolean;
  replyMode?: "human_handling" | "workspace_default";
  replyDecision?: ReplyDecision | null;
  pendingDraft?: {
    suggestion: string;
    sources?: Array<{ title: string; citation?: string; similarity: number }>;
    aiRunId?: string;
    createdAt?: string;
  } | null;
  requiresHuman?: boolean;
  handoffReason?: string | null;
  assignment?: AssignmentExplain | null;
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
  const copy = useConversationsCopy();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const myUserId = useAuthStore((s) => s.user?.id);
  const canSend = canWrite(role);
  const canAssignOthers = canAssignWork(role);
  const canEditAssignmentRules = canAssignOthers || canManageTeam(role);
  const canTakeOver = canAssignToSelf(role);
  const canToggleAi = canToggleInboxAi(role);
  const queryClient = useQueryClient();
  const { connected: live } = useRealtime();
  const { error: toastError } = useToast();
  const showMutationError = (e: unknown, fallback: string) => {
    toastError(toUserMessage(e, fallback));
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftMeta, setDraftMeta] = useState<{
    aiRunId?: string;
    sources: Array<{ title: string; citation?: string; similarity: number }>;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showOutbound, setShowOutbound] = useState(false);
  const [lostPrompt, setLostPrompt] = useState(false);
  const [wonPrompt, setWonPrompt] = useState(false);
  const [listFilter, setListFilter] = useState<InboxListFilter>("all");
  const [listScope, setListScope] = useState<InboxListScope>("active");
  const [queueDefaultReady, setQueueDefaultReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const queueDefaultedRef = useRef(false);
  const urlHadFilterRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) setSelectedId(c);
    const f = params.get("filter");
    if (f === "handoff" || f === "unread" || f === "unassigned" || f === "mine" || f === "all") {
      urlHadFilterRef.current = true;
      if (f !== "all") setListFilter(f);
    }
    const s = params.get("scope");
    if (s === "closed") setListScope("closed");
    setQueueDefaultReady(true);

    function onPopState() {
      const p = new URLSearchParams(window.location.search);
      setSelectedId(p.get("c"));
      const filter = p.get("filter");
      setListFilter(
        filter === "handoff" ||
          filter === "unread" ||
          filter === "unassigned" ||
          filter === "mine"
          ? filter
          : "all",
      );
      setListScope(p.get("scope") === "closed" ? "closed" : "active");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const { data: listData, isLoading: listLoading, isError: listError, refetch: refetchList } = useQuery({
    queryKey: ["conversations", searchDebounced, listFilter, listScope],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (searchDebounced) params.set("q", searchDebounced);
      if (listFilter !== "all") params.set("filter", listFilter);
      if (listScope === "closed") params.set("scope", "closed");
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
      apiFetch<{
        humanHandoffRecommended: number;
        unreadMessages: number;
        queue?: { yourTurn: number; mine: number; unassigned: number };
      }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 15_000,
    refetchInterval: live ? 20_000 : 30_000,
  });

  const { data: coachingProgress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<{
        coaching?: {
          eligible: boolean;
          hasTakeover?: boolean;
          next: null | { id: string };
        };
      }>("/organizations/onboarding-progress", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 30_000,
  });
  const coachTakeover =
    !!coachingProgress?.coaching?.eligible &&
    coachingProgress.coaching.next?.id === "takeover";

  const queueCounts = convStats?.queue ?? {
    yourTurn: convStats?.humanHandoffRecommended ?? 0,
    mine: 0,
    unassigned: 0,
    postCloseUnread: 0,
  };

  const { data: whatsappAccounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;

  // Daily queue habit: land on Your turn → Mine → Unassigned when opening Conversations cold.
  useEffect(() => {
    if (!queueDefaultReady || !hasWhatsapp || queueDefaultedRef.current) return;
    if (urlHadFilterRef.current || selectedId) {
      queueDefaultedRef.current = true;
      return;
    }
    if (!convStats) return;
    queueDefaultedRef.current = true;
    const next = pickDailyQueueFilter(queueCounts);
    if (next === "all") return;
    setListFilter(next);
    const params = new URLSearchParams(window.location.search);
    params.set("filter", next);
    window.history.replaceState(null, "", `/dashboard/inbox?${params.toString()}`);
    trackQueue("queue_default_applied", { filter: next, yourTurn: queueCounts.yourTurn });
  }, [queueDefaultReady, hasWhatsapp, convStats, queueCounts, selectedId]);

  const { data: thread, isLoading: threadLoading, isError: threadError, refetch: refetchThread } = useQuery({
    queryKey: ["conversation", selectedId],
    queryFn: () =>
      apiFetch<ConversationDetail>(`/conversations/${selectedId}`, { token: token ?? undefined }),
    enabled: !!token && !!selectedId,
    refetchInterval: live ? false : 4_000,
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

  useEffect(() => {
    const pending = thread?.pendingDraft;
    if (!pending?.suggestion || !thread?.aiEnabled) return;
    setShowComposer(true);
    setDraft(pending.suggestion);
    setDraftMeta({
      aiRunId: pending.aiRunId,
      sources: pending.sources ?? [],
    });
  }, [thread?.id, thread?.pendingDraft?.createdAt, thread?.aiEnabled]);

  const { data: intelligence } = useQuery({
    queryKey: ["conversation-intelligence", selectedId],
    queryFn: () =>
      apiFetch<{
        knowledgeGaps: string[];
        observedMemory: Array<{ id: string; type: string; content: string }>;
        replyDecision?: ReplyDecision | null;
        customerNeeds?: string[];
        workingMemory?: import("@growvisi/shared").WorkingMemory;
        kbHealth?: import("@growvisi/shared").KnowledgeHealthSummary;
      }>(`/conversations/${selectedId}/intelligence`, { token: token ?? undefined }),
    enabled: !!token && !!selectedId,
  });

  const replyDecision = thread?.replyDecision ?? intelligence?.replyDecision ?? null;

  const suggestMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        suggestion: string;
        aiRunId?: string;
        sources: Array<{ title: string; citation?: string; similarity: number }>;
      }>(`/conversations/${selectedId}/suggest-reply`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: (res) => {
      setDraft(res.suggestion);
      setDraftMeta({ aiRunId: res.aiRunId, sources: res.sources ?? [] });
      setSendError(null);
      void queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
    },
    onError: (e) => {
      setSendError(toUserMessage(e, "Could not suggest a reply."));
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
    onError: (e) => showMutationError(e, "Could not update AI settings."),
  });

  const lastMessage = thread?.messages[thread.messages.length - 1];
  const lastInboundMs =
    thread?.lastInboundAt != null
      ? new Date(thread.lastInboundAt).getTime()
      : lastMessage?.direction === "INBOUND"
        ? new Date(lastMessage.createdAt).getTime()
        : 0;
  const decisionMs = replyDecision?.evaluatedAt
    ? new Date(replyDecision.evaluatedAt).getTime()
    : 0;
  const classifySettled =
    !!replyDecision && lastInboundMs > 0 && decisionMs >= lastInboundMs - 3_000;

  const awaitingAiDraft =
    !!thread?.aiEnabled &&
    !thread?.pendingDraft?.suggestion &&
    !suggestMutation.isPending &&
    !aiToggleMutation.isPending &&
    lastMessage?.direction === "INBOUND" &&
    !classifySettled &&
    lastInboundMs > 0 &&
    Date.now() - lastInboundMs < 120_000;

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
    onError: (e) => showMutationError(e, "Could not assign this conversation."),
  });

  const stageMutation = useMutation({
    mutationFn: ({ stage, reason }: { stage: LeadStage; reason?: string }) =>
      apiFetch(`/leads/${thread?.lead?.id}/stage`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ stage, reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      if (leadId) void queryClient.invalidateQueries({ queryKey: ["lead-timeline", leadId] });
    },
    onError: (e) => showMutationError(e, "Could not update pipeline stage."),
  });

  function handleStageChange(next: LeadStage) {
    if (!thread?.lead || next === thread.lead.stage) return;
    if (next === "LOST") {
      setLostPrompt(true);
      return;
    }
    if (next === "WON") {
      setWonPrompt(true);
      return;
    }
    stageMutation.mutate({ stage: next });
  }

  const resolveHandoffMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/conversations/${selectedId}/resolve-handoff`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      const doneId = selectedId;
      void queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation-stats"] });
      if (doneId) advanceAfterAction(doneId);
    },
    onError: (e) => showMutationError(e, "Could not resolve handoff."),
  });

  const takeoverMutation = useMutation({
    mutationFn: (taskTitle?: string) =>
      apiFetch<ConversationDetail>(`/conversations/${selectedId}/takeover`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ taskTitle }),
      }),
    onSuccess: (updated) => {
      trackCoaching("coaching_takeover_complete");
      queryClient.setQueryData(["conversation", selectedId], updated);
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["pending-setup-actions"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => showMutationError(e, "Could not take over this conversation."),
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch(`/conversations/${selectedId}/messages`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          content,
          draftText: draftMeta?.aiRunId ? draft : undefined,
          aiRunId: draftMeta?.aiRunId,
        }),
      }),
    onSuccess: () => {
      setDraft("");
      setDraftMeta(null);
      setSendError(null);
      void queryClient.invalidateQueries({ queryKey: ["conversation", selectedId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation-stats"] });
    },
    onError: (e) => {
      setSendError(toUserMessage(e, "Message could not be sent."));
    },
  });

  const conversations = listData?.data ?? [];

  /** After clearing Your turn, open the next waiting chat so agents stay in flow. */
  function advanceAfterAction(doneId: string) {
    if (listFilter !== "handoff") return;
    const remaining = conversations.filter((c) => c.id !== doneId);
    if (remaining[0]) {
      trackQueue("queue_advance_next", { filter: listFilter, remaining: remaining.length });
      selectConversation(remaining[0].id);
      return;
    }
    trackQueue("queue_caught_up", { filter: listFilter });
  }

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

  function replaceInboxUrl(params: URLSearchParams) {
    const q = params.toString();
    window.history.replaceState(null, "", q ? `/dashboard/inbox?${q}` : "/dashboard/inbox");
  }

  function setInboxFilter(filter: InboxListFilter) {
    setListFilter(filter);
    trackQueue("queue_filter_click", { filter });
    const params = new URLSearchParams(window.location.search);
    if (filter !== "all") params.set("filter", filter);
    else params.delete("filter");
    replaceInboxUrl(params);
  }

  function setInboxScope(scope: InboxListScope) {
    const nextFilter =
      scope === "closed" && listFilter === "handoff" ? "all" : listFilter;
    if (nextFilter !== listFilter) setListFilter(nextFilter);
    setListScope(scope);

    const params = new URLSearchParams(window.location.search);
    if (scope === "closed") params.set("scope", "closed");
    else params.delete("scope");
    if (nextFilter !== "all") params.set("filter", nextFilter);
    else params.delete("filter");
    replaceInboxUrl(params);
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

  const withinMessagingWindow = (() => {
    if (!thread?.lastInboundAt) return false;
    const last = new Date(thread.lastInboundAt).getTime();
    if (Number.isNaN(last)) return false;
    return Date.now() - last < 24 * 60 * 60 * 1000;
  })();

  const windowClosed = !!thread && !withinMessagingWindow;

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-row overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_2px_16px_rgb(11_28_48/0.05)] max-lg:rounded-none max-lg:border-0 lg:mx-4 lg:mb-4 lg:mt-2">
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
          listScope={listScope}
          onListFilterChange={setInboxFilter}
          onListScopeChange={setInboxScope}
          queueCounts={queueCounts}
        />
      </div>

      {/* Thread + timeline — always visible on md+ */}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col bg-background/40",
          selectedId ? "flex" : "max-md:hidden",
          "md:flex",
        )}
      >
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border/80">
              <Inbox className="h-7 w-7 text-accent" />
            </div>
            <div className="max-w-sm space-y-1">
              <h2 className="text-lg font-bold tracking-tight">
                {queueCounts.yourTurn > 0 || queueCounts.mine > 0 || queueCounts.unassigned > 0
                  ? copy.dailyQueueTitle
                  : copy.selectTitle}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {queueCounts.yourTurn > 0 || queueCounts.mine > 0 || queueCounts.unassigned > 0
                  ? copy.dailyQueueHint
                  : copy.selectBody}
              </p>
            </div>
            <div className="mt-2 grid max-w-md gap-2 text-left text-xs text-muted-foreground sm:grid-cols-3">
              <div className="rounded-xl border border-border/80 bg-card px-3 py-2.5">
                <p className="font-semibold text-foreground">Thread</p>
                <p className="mt-0.5">Full message history</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card px-3 py-2.5">
                <p className="font-semibold text-foreground">AI & owner</p>
                <p className="mt-0.5">Classify and assign</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card px-3 py-2.5">
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
            <div className="shrink-0 border-b border-border/80 bg-card">
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
                    {intelligence?.workingMemory &&
                    (intelligence.workingMemory.relationshipPhase === "post_sale" ||
                      intelligence.workingMemory.relationshipPhase === "win_back") ? (
                      <>
                        <span aria-hidden className="text-border">·</span>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                          {formatRelationshipPhase(intelligence.workingMemory.relationshipPhase)}
                        </span>
                      </>
                    ) : null}
                    {thread.lead && (() => {
                      const lead = thread.lead;
                      const hasValue = lead.valueCents != null && lead.valueCents > 0;
                      const closed = lead.stage === "WON" || lead.stage === "LOST";
                      const pipelineHref = `/dashboard/pipeline?lead=${lead.id}`;

                      if (hasValue) {
                        const label =
                          lead.stage === "WON"
                            ? copy.dealClosed(formatInr(lead.valueCents))
                            : copy.dealValue(formatInr(lead.valueCents));
                        return (
                          <>
                            <span aria-hidden className="text-border">·</span>
                            <Link
                              href={pipelineHref}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition hover:underline",
                                lead.stage === "WON"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-background text-foreground",
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
                              {copy.addDealValue}
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
                            {copy.viewOnPipeline}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 md:flex">
                  {canToggleAi &&
                    (!thread.aiEnabled ? (
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          {copy.handlingThisThread}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-full px-2.5 text-[11px]"
                          disabled={aiToggleMutation.isPending}
                          onClick={() => aiToggleMutation.mutate(true)}
                        >
                          {copy.letGrowvisiHelp}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full px-2.5 text-[11px]"
                        disabled={aiToggleMutation.isPending}
                        onClick={() => aiToggleMutation.mutate(false)}
                      >
                        {copy.illHandleThis}
                      </Button>
                    ))}
                  {thread.lead?.score != null && thread.lead.score > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        thread.lead.score >= HOT_LEAD_SCORE_THRESHOLD
                          ? "bg-accent text-white"
                          : "bg-bento-mint text-accent",
                      )}
                      title="Lead score from AI"
                    >
                      {thread.lead.score >= HOT_LEAD_SCORE_THRESHOLD
                        ? copy.scoreHot(thread.lead.score)
                        : copy.scoreWarm(thread.lead.score)}
                    </span>
                  )}
                  {thread.lead && (
                    canSend ? (
                      <select
                        className={cn(
                          "max-w-[110px] truncate rounded-full border px-2 py-0.5 text-xs font-semibold",
                          STAGE_BADGE[thread.lead.stage as LeadStage] ?? "bg-primary-soft text-accent",
                        )}
                        value={thread.lead.stage}
                        disabled={stageMutation.isPending}
                        onChange={(e) => handleStageChange(e.target.value as LeadStage)}
                      >
                        {LEAD_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {copy.stageLabel(s)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          STAGE_BADGE[thread.lead.stage as LeadStage],
                        )}
                      >
                        {copy.stageLabel(thread.lead.stage)}
                      </span>
                    )
                  )}
                  {thread.requiresHuman && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                      {copy.waitingOnYou}
                    </span>
                  )}
                </div>
              </div>
              <InboxThreadDetailsMobile
                stage={thread.lead?.stage as LeadStage | undefined}
                score={thread.lead?.score}
                assignedToId={thread.assignedTo?.id ?? null}
                assignment={thread.assignment}
                showAssignmentRulesLink={canEditAssignmentRules}
                teamMembers={teamMembers ?? []}
                canAssignOthers={canAssignOthers}
                canTakeOver={canTakeOver}
                myUserId={myUserId}
                canEditStage={canSend && !!thread.lead}
                stagePending={stageMutation.isPending}
                assignPending={assignMutation.isPending}
                onStageChange={(s) => handleStageChange(s)}
                onAssign={(userId) => assignMutation.mutate(userId)}
              />
              <InboxAiPanel
                aiContext={thread.aiContext ?? null}
                requiresHuman={thread.requiresHuman}
                handoffReason={thread.handoffReason}
                canEdit={canSend}
                takeoverPending={takeoverMutation.isPending}
                resolvePending={resolveHandoffMutation.isPending}
                coachTakeover={coachTakeover}
                onTakeover={(title) => {
                  const t =
                    title ||
                    thread.aiContext?.nextAction ||
                    `Follow up: ${thread.contactName ?? thread.contactPhone}`;
                  takeoverMutation.mutate(t);
                }}
                onResolveHandoff={() => resolveHandoffMutation.mutate()}
                knowledgeGaps={intelligence?.knowledgeGaps ?? []}
                kbHealth={intelligence?.kbHealth ?? null}
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-background/60 px-4 py-1.5 lg:px-5">
                <div className="hidden items-center gap-2 rounded-lg border border-border/50 bg-card px-2.5 py-1 md:flex">
                  <label htmlFor="assign-agent" className="text-xs font-medium text-muted-foreground">
                    {copy.assignedTo}
                  </label>
                  {canAssignOthers ? (
                  <select
                    id="assign-agent"
                    className="max-w-[140px] truncate rounded-md border-0 bg-transparent text-xs font-medium focus:outline-none"
                    value={thread.assignedTo?.id ?? ""}
                    disabled={assignMutation.isPending}
                    onChange={(e) => {
                      const v = e.target.value;
                      assignMutation.mutate(v ? v : null);
                    }}
                  >
                    <option value="">{copy.unassigned}</option>
                    {(teamMembers ?? []).map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name ?? m.user.email}
                      </option>
                    ))}
                  </select>
                  ) : canTakeOver && !thread.assignedTo?.id ? (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="h-7 rounded-lg text-xs"
                      disabled={assignMutation.isPending}
                      onClick={() => myUserId && assignMutation.mutate(myUserId)}
                    >
                      {copy.assignedTo} me
                    </Button>
                  ) : (
                    <span className="text-xs font-medium text-foreground">
                      {thread.assignedTo?.name ?? thread.assignedTo?.email ?? copy.unassigned}
                    </span>
                  )}
                </div>
                {canToggleAi &&
                  (!thread.aiEnabled ? (
                    <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center">
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-center text-xs font-semibold text-amber-900">
                        {copy.handlingThisThread}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1 text-xs"
                        disabled={aiToggleMutation.isPending}
                        onClick={() => aiToggleMutation.mutate(true)}
                      >
                        {copy.letGrowvisiHelp}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-full text-xs md:hidden"
                      disabled={aiToggleMutation.isPending}
                      onClick={() => aiToggleMutation.mutate(false)}
                    >
                      {copy.illHandleThis}
                    </Button>
                  ))}
                <span className="ml-auto text-xs text-muted-foreground">
                  {live ? copy.live : "Syncing"}
                </span>
              </div>
            </div>

            <div className="conversation-thread-bg flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 custom-scrollbar lg:px-6">
              <div className="mx-auto mt-auto flex w-full max-w-3xl flex-col gap-2.5">
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                      m.direction === "OUTBOUND"
                        ? "ml-auto rounded-br-md border border-emerald-200/60 bg-whatsapp-green text-foreground"
                        : "mr-auto rounded-bl-md border border-white/80 bg-card text-foreground",
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
                        "mt-1 flex items-center gap-1.5 text-xs",
                        m.direction === "OUTBOUND" ? "text-emerald-800/60" : "text-muted-foreground",
                      )}
                    >
                      {m.sentByAi && m.direction === "OUTBOUND" && (
                        <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          AI
                        </span>
                      )}
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="shrink-0 border-t border-border/80 bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6">
              <div className="mx-auto w-full max-w-3xl">
                {windowClosed && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
                    <p className="font-semibold">24-hour reply window closed</p>
                    <p className="mt-0.5 text-amber-900/90">
                      Free-text replies need a recent customer message. Use{" "}
                      <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => setShowOutbound(true)}
                      >
                        New message
                      </button>{" "}
                      with an approved WhatsApp template to re-engage.
                    </p>
                  </div>
                )}
                {(replyDecision || awaitingAiDraft) && (
                  <div className="mb-2">
                    {awaitingAiDraft ? (
                      <div className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-xs text-muted-foreground">
                        <span
                          className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
                          aria-hidden
                        />
                        <span>{copy.aiDraftGenerating}</span>
                      </div>
                    ) : (
                      <InboxReplyDecision
                        decision={replyDecision}
                        hasDraft={!!thread.pendingDraft?.suggestion}
                      />
                    )}
                  </div>
                )}
                {showComposer ? (
                  <InboxComposer
                    draft={draft}
                    onDraftChange={setDraft}
                    onSend={handleSend}
                    sendPending={sendMutation.isPending}
                    sendDisabled={!thread.whatsappAccount.isActive || windowClosed || !canSend}
                    sendError={sendError}
                    showAiSuggest={
                      !!capabilities?.aiSuggestReply &&
                      !thread.aiEnabled &&
                      !windowClosed
                    }
                    suggestPending={suggestMutation.isPending}
                    onSuggest={() => suggestMutation.mutate()}
                    draftSources={draftMeta?.sources}
                    templates={
                      thread.pendingDraft?.suggestion ? undefined : replyTemplates?.templates
                    }
                    composeRef={composeRef}
                    onMinimize={() => setShowComposer(false)}
                    draftNote={
                      thread.aiEnabled && thread.pendingDraft?.suggestion
                        ? [
                            replyDecision?.reasons.find((r) =>
                              r.startsWith("Auto-reply blocked"),
                            ),
                            replyDecision?.reasons[0],
                            copy.aiDraftNote,
                          ].find(Boolean)
                        : undefined
                    }
                  />
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3.5 text-left transition hover:border-accent/25 hover:bg-bento-mint/40"
                    onClick={() => setShowComposer(true)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">
                        {copy.composePlaceholder}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">
                      <ChevronUp className="h-3.5 w-3.5" />
                      Reply
                    </span>
                  </button>
                )}
              </div>
            </div>

            {thread.lead && (
              <div className="shrink-0 border-t border-border/80 bg-card px-4 py-3 lg:hidden">
                <button
                  type="button"
                  className="mb-2 text-xs font-semibold text-accent"
                  onClick={() => setShowTimeline((v) => !v)}
                >
                  {showTimeline ? "Hide activity" : "Show activity & stage history"}
                </button>
                {showTimeline && (
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                    {(timeline?.events ?? []).slice(0, 12).map((ev) => (
                      <li key={ev.id} className="border-b border-border/40 pb-2 last:border-0">
                        <p className="font-medium text-foreground">{ev.title}</p>
                        {ev.detail && (
                          <p className="mt-0.5 text-muted-foreground">{ev.detail}</p>
                        )}
                      </li>
                    ))}
                    {(timeline?.events?.length ?? 0) === 0 && (
                      <li className="text-muted-foreground">
                        No activity yet — AI runs when messages arrive.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
            </div>

            {thread.lead && (
              <InboxTimeline
                className="hidden lg:flex"
                events={timeline?.events ?? []}
                aiConfidence={timeline?.lead.aiConfidence}
                hasClassification={!!thread.aiContext}
                workingMemory={intelligence?.workingMemory}
                open={showTimeline}
                onToggle={() => setShowTimeline((v) => !v)}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
    <LostReasonDialog
      open={lostPrompt}
      leadName={thread?.contactName}
      loading={stageMutation.isPending}
      onCancel={() => setLostPrompt(false)}
      onConfirm={(reason) => {
        stageMutation.mutate(
          { stage: "LOST", reason },
          { onSuccess: () => setLostPrompt(false) },
        );
      }}
    />
    <WonReasonDialog
      open={wonPrompt}
      leadName={thread?.contactName}
      loading={stageMutation.isPending}
      onCancel={() => setWonPrompt(false)}
      onConfirm={(reason) => {
        stageMutation.mutate(
          { stage: "WON", reason },
          { onSuccess: () => setWonPrompt(false) },
        );
      }}
    />
    <OutboundCompose
      open={showOutbound}
      onClose={() => setShowOutbound(false)}
      onSent={(id) => selectConversation(id)}
    />
    </>
  );
}
