"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Sparkles, ArrowLeft, Inbox } from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { InboxThreadSkeleton } from "@/components/ui/skeleton";
import { formatStage } from "@/lib/stage-labels";
import { LEAD_STAGES, STAGE_LABELS } from "@/lib/crm";
import type { LeadStage } from "@growvisi/shared";
import { InboxConversationList } from "@/components/dashboard/inbox-conversation-list";
import { InboxAiPanel, type InboxAiContext } from "@/components/dashboard/inbox-ai-panel";
import { OutboundCompose } from "@/components/dashboard/outbound-compose";
import { InboxMessageBody } from "@/components/dashboard/inbox-message-body";
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
  lead: { id: string; stage: string; score?: number; aiConfidence?: number | null } | null;
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
  const [listFilter, setListFilter] = useState<"all" | "handoff">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) setSelectedId(c);
    if (params.get("filter") === "handoff") setListFilter("handoff");

    function onPopState() {
      const p = new URLSearchParams(window.location.search);
      setSelectedId(p.get("c"));
      setListFilter(p.get("filter") === "handoff" ? "handoff" : "all");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const { data: listData, isLoading: listLoading, isError: listError, refetch: refetchList } = useQuery({
    queryKey: ["conversations", searchDebounced, listFilter],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (searchDebounced) params.set("q", searchDebounced);
      if (listFilter === "handoff") params.set("filter", "handoff");
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

  function setInboxFilter(filter: "all" | "handoff") {
    setListFilter(filter);
    const params = new URLSearchParams(window.location.search);
    if (filter === "handoff") params.set("filter", "handoff");
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
          handoffCount={convStats?.humanHandoffRecommended}
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
              <h2 className="text-lg font-bold tracking-tight">Select a conversation</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Pick a contact on the left to view messages, AI classification, and pipeline
                timeline. Customer replies happen in WhatsApp via Meta Business Agent.
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
                  <p className="truncate text-xs text-muted-foreground">{thread.contactPhone}</p>
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
                    >
                      {thread.lead.score}
                    </span>
                  )}
                  {thread.lead && (
                    canSend ? (
                      <select
                        className="max-w-[110px] truncate rounded-full border border-primary-soft bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-accent"
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
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                        {formatStage(thread.lead.stage)}
                      </span>
                    )
                  )}
                  {thread.requiresHuman && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Handoff
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
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    AI
                  </span>
                  <span className="scale-90">
                    <Switch
                      checked={thread.aiEnabled}
                      disabled={aiToggleMutation.isPending}
                      onCheckedChange={(v) => aiToggleMutation.mutate(v)}
                      aria-label="Toggle AI classification"
                    />
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-white px-2.5 py-1.5">
                  <label htmlFor="assign-agent" className="text-[10px] font-medium text-muted-foreground">
                    Owner
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
                    <option value="">Unassigned</option>
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

            <div className="shrink-0 border-t border-border/80 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-5">
              <div className="mx-auto max-w-xl">
                {showComposer ? (
                <form onSubmit={handleSend} className="space-y-2">
                  {sendError && (
                    <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      <p className="font-medium">{sendError}</p>
                      {(sendError.toLowerCase().includes("auth") ||
                        sendError.toLowerCase().includes("token")) && (
                        <a
                          href="/dashboard/settings?tab=whatsapp"
                          className="mt-1 inline-block font-semibold underline"
                        >
                          Refresh WhatsApp token →
                        </a>
                      )}
                    </div>
                  )}
                  {(replyTemplates?.templates?.length ?? 0) > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                      {replyTemplates!.templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="shrink-0 rounded-full border border-border/80 bg-[#f8f9ff] px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent/40 hover:text-accent"
                          onClick={() => setDraft(t.body)}
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2 rounded-xl border border-border/80 bg-[#f8f9ff] p-1.5 shadow-sm">
                    <div className="min-w-0 flex-1 py-1">
                      <Input
                        placeholder="Human takeover reply…"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={sendMutation.isPending || !thread.whatsappAccount.isActive}
                        className="border-0 bg-transparent text-base shadow-none focus-visible:ring-0 md:text-sm"
                      />
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {capabilities?.aiSuggestReply && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground"
                          disabled={suggestMutation.isPending}
                          onClick={() => suggestMutation.mutate()}
                          title="Draft suggestion"
                        >
                          {suggestMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        type="submit"
                        size="icon"
                        className="h-9 w-9 rounded-xl bg-accent hover:bg-accent-hover"
                        disabled={
                          !draft.trim() || sendMutation.isPending || !thread.whatsappAccount.isActive
                        }
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                    Meta Business Agent replies in WhatsApp · use this for human takeover only
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setShowComposer(false)}
                  >
                    Hide composer
                  </button>
                </form>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={() => setShowComposer(true)}
                  >
                    Reply from Growvisi (human takeover)
                  </Button>
                )}
              </div>
            </div>
            </div>

            {thread.lead && (
              <InboxTimeline
                className="hidden lg:flex"
                events={timeline?.events ?? []}
                aiConfidence={timeline?.lead.aiConfidence}
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
