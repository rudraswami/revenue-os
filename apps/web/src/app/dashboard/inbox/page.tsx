"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Sparkles, Clock, ArrowLeft, Inbox, MessageSquare, Search } from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { InboxListSkeleton, InboxThreadSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { formatStage } from "@/lib/stage-labels";
import { InboxMessageBody } from "@/components/dashboard/inbox-message-body";
import { MetaAiNotice } from "@/components/dashboard/meta-ai-notice";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch, ApiError } from "@/lib/api-client";
import { EYEBROW, NAV } from "@/lib/brand-copy";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface ConversationRow {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastMessageAt: string | null;
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
  lead: { id: string; stage: string; score?: number; aiConfidence?: number | null } | null;
  messages: Message[];
  whatsappAccount: { displayPhoneNumber: string; isActive: boolean };
}

interface TimelineEvent {
  id: string;
  type: "stage_change" | "ai_classify";
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
  const queryClient = useQueryClient();
  const { connected: live } = useRealtime();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) setSelectedId(c);
  }, []);

  const { data: listData, isLoading: listLoading, isError: listError, refetch: refetchList } = useQuery({
    queryKey: ["conversations", searchDebounced],
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (searchDebounced) params.set("q", searchDebounced);
      return apiFetch<{ data: ConversationRow[] }>(`/conversations?${params}`, {
        token: token ?? undefined,
      });
    },
    enabled: !!token,
    refetchInterval: live ? 5_000 : 8_000,
  });

  const { data: whatsappAccounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;

  const { data: thread, isLoading: threadLoading } = useQuery({
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
    window.history.replaceState(null, "", `/dashboard/inbox?c=${id}`);
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
    <div className="flex h-[calc(100dvh-57px)] bg-background lg:h-[calc(100vh)]">
      <div
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-border/80 bg-white lg:w-[320px]",
          selectedId ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="border-b border-border bg-gradient-to-r from-white to-background px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                {EYEBROW.messaging}
              </p>
              <h1 className="text-lg font-bold tracking-tight">{NAV.conversations}</h1>
            </div>
            {hasWhatsapp && (
              <span className="status-pill bg-bento-mint text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                WhatsApp linked
              </span>
            )}
            {live && (
              <span className="status-pill bg-bento-mint text-accent">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Live
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ingest and analyze customer WhatsApp threads
          </p>
          {conversations.length > 0 && (
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-9 bg-muted/40 pl-9 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {listLoading && <InboxListSkeleton />}

          {listError && !listLoading && (
            <QueryErrorState onRetry={() => void refetchList()} />
          )}

          {!listLoading && !listError && !hasWhatsapp && (
            <EmptyState
              compact
              icon={<MessageSquare className="h-6 w-6" />}
              title="WhatsApp not connected"
              description="Link your business number to receive customer messages here."
              actionHref="/dashboard/settings"
              actionLabel="Connect WhatsApp"
              secondaryHref="/onboarding"
              secondaryLabel="Guided setup"
            />
          )}

          {!listLoading && !listError && hasWhatsapp && conversations.length === 0 && (
            <EmptyState
              compact
              icon={<Inbox className="h-6 w-6" />}
              title="No messages yet"
              description="Send a WhatsApp from your personal phone to your business number (not from the Meta test number). Add your phone under Meta → API Setup → test recipients, then check connection status in Settings."
              actionHref="/dashboard/settings"
              actionLabel="WhatsApp settings"
            />
          )}

          <div className="space-y-1">
            {conversations.map((c) => {
              const displayName = c.contactName ?? c.contactPhone;
              return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150",
                  selectedId === c.id
                    ? "bg-[#ecfdf5] shadow-sm ring-1 ring-accent/20"
                    : "hover:bg-[#f8f9ff]",
                  c.unreadCount > 0 && selectedId !== c.id && "bg-white ring-1 ring-[#dce9ff]",
                )}
              >
                <AvatarInitials name={displayName} size="sm" />
                <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-sm">
                    {displayName}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-0.5 truncate text-xs",
                    selectedId === c.id ? "text-primary/70" : "text-muted-foreground",
                  )}
                >
                  {c.messages[0]?.content ?? "No messages"}
                </p>
                {c.lead && (
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      selectedId === c.id ? "bg-accent/10 text-accent" : "bg-[#e5eeff] text-muted-foreground",
                    )}
                  >
                    {formatStage(c.lead.stage)}
                  </span>
                )}
                </div>
              </button>
            );
            })}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          !selectedId ? "hidden lg:flex" : "flex",
        )}
      >
        {!selectedId ? (
          <div className="hidden flex-1 flex-col items-center justify-center gap-2 p-8 text-center lg:flex">
            <EmptyState
              compact
              icon={<Inbox className="h-6 w-6" />}
              title="Select a conversation"
              description="View the thread, AI classification, and lead timeline. Replies happen in WhatsApp via Meta Business Agent."
            />
          </div>
        ) : threadLoading && !thread ? (
          <InboxThreadSkeleton />
        ) : thread ? (
          <div className="flex flex-1 min-w-0">
            <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-3 border-b border-border/80 bg-white px-4 py-4 lg:px-6">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 lg:hidden"
                onClick={clearSelection}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <AvatarInitials name={thread.contactName ?? thread.contactPhone} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{thread.contactName ?? thread.contactPhone}</p>
                <p className="truncate text-xs text-muted-foreground">{thread.contactPhone}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {live ? "Live updates" : "Refreshes every few seconds"}
                </span>
                <div className="flex items-center gap-2">
                {thread.lead?.score != null && thread.lead.score > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                      thread.lead.score >= 80
                        ? "bg-accent text-white"
                        : "bg-[#ecfdf5] text-accent",
                    )}
                  >
                    Score {thread.lead.score}
                  </span>
                )}
                {thread.lead && (
                  <span className="rounded-full bg-[#e5eeff] px-3 py-1 text-xs font-semibold text-accent">
                    {formatStage(thread.lead.stage)}
                  </span>
                )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="text-[11px] font-medium text-muted-foreground">AI classify</span>
                <Switch
                  checked={thread.aiEnabled}
                  disabled={aiToggleMutation.isPending}
                  onCheckedChange={(v) => aiToggleMutation.mutate(v)}
                  aria-label="Toggle AI classification for this conversation"
                />
              </div>
            </div>

            <div className="conversation-thread-bg flex-1 overflow-y-auto px-4 py-4 custom-scrollbar lg:px-6">
              <div className="mx-auto flex max-w-2xl flex-col gap-2">
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                      m.direction === "OUTBOUND"
                        ? "ml-auto rounded-br-md bg-[#dcf8c6] text-foreground"
                        : "mr-auto rounded-bl-md bg-white text-foreground",
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

            <div className="border-t border-border/80 bg-muted/20 p-4 lg:bg-white">
              <div className="mx-auto max-w-2xl space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                <MetaAiNotice compact />
                {showComposer ? (
                <form onSubmit={handleSend} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Reply within WhatsApp&apos;s 24-hour customer service window. Prefer Meta
                    Business Agent for automated replies — use this when your team must respond from
                    Growvisi.
                  </p>
                  {sendError && (
                    <p className="text-center text-xs text-destructive">{sendError}</p>
                  )}
                  {capabilities?.aiSuggestReply && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        disabled={suggestMutation.isPending}
                        onClick={() => suggestMutation.mutate()}
                      >
                        {suggestMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Draft suggestion
                      </Button>
                    </div>
                  )}
                  {(replyTemplates?.templates?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {replyTemplates!.templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="rounded-full border border-border/80 bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent/40 hover:text-accent"
                          onClick={() => setDraft(t.body)}
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your reply…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      disabled={sendMutation.isPending || !thread.whatsappAccount.isActive}
                    />
                    <Button
                      type="submit"
                      size="icon"
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowComposer(false)}
                  >
                    Hide composer
                  </Button>
                </form>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowComposer(true)}
                  >
                    Show reply composer
                  </Button>
                )}
              </div>
            </div>
            </div>

            {thread.lead && (
              <aside className="hidden w-72 shrink-0 flex-col border-l border-[#dce9ff] bg-[#f8f9ff]/50 lg:flex">
                <div className="border-b border-[#dce9ff] bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" />
                    <h2 className="text-sm font-bold">Lead timeline</h2>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    AI classification & pipeline changes
                  </p>
                  {timeline?.lead.aiConfidence != null && (
                    <div className="mt-3 rounded-xl bg-[#ecfdf5] px-3 py-2 text-[11px] font-semibold text-accent">
                      AI confidence · {Math.round(timeline.lead.aiConfidence * 100)}%
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {!timeline?.events.length && (
                    <p className="rounded-xl border border-dashed border-[#dce9ff] bg-white px-3 py-4 text-center text-xs text-muted-foreground">
                      Timeline fills in after the next message is classified.
                    </p>
                  )}
                  <ul className="space-y-4">
                    {timeline?.events.map((ev) => (
                      <li key={ev.id} className="relative border-l-2 border-accent/30 pl-4">
                        <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                        <p className="text-xs font-semibold">{ev.title}</p>
                        {ev.detail && (
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{ev.detail}</p>
                        )}
                        <p className="mt-1.5 text-[10px] text-muted-foreground">
                          {new Date(ev.at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
