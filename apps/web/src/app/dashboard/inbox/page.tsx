"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Sparkles, Clock, ArrowLeft, Inbox, MessageSquare } from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InboxListSkeleton, InboxThreadSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { formatStage } from "@/lib/stage-labels";
import { apiFetch, ApiError } from "@/lib/api-client";
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
  content: string | null;
  createdAt: string;
  status: string;
}

interface ConversationDetail {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) setSelectedId(c);
  }, []);

  const { data: listData, isLoading: listLoading, isError: listError, refetch: refetchList } = useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      apiFetch<{ data: ConversationRow[] }>("/conversations?pageSize=50", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    refetchInterval: live ? false : 15_000,
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
          "flex w-full shrink-0 flex-col border-r border-border bg-background lg:w-80",
          selectedId ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="border-b border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Inbox</h1>
            {live && (
              <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium text-success">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Customer WhatsApp messages</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
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
              description="Ask someone to send a WhatsApp to your business number. It will show up here."
              actionHref="/dashboard/settings"
              actionLabel="WhatsApp settings"
            />
          )}

          <div className="space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-3 text-left transition-all",
                  selectedId === c.id
                    ? "bg-primary-soft text-primary"
                    : "hover:bg-muted",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium text-sm">
                    {c.contactName ?? c.contactPhone}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
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
                      "mt-1 inline-block text-[10px] uppercase",
                      selectedId === c.id ? "text-primary/60" : "text-muted-foreground",
                    )}
                  >
                    {formatStage(c.lead.stage)}
                  </span>
                )}
              </button>
            ))}
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
              description="Choose a customer on the left to read and reply."
            />
          </div>
        ) : threadLoading && !thread ? (
          <InboxThreadSkeleton />
        ) : thread ? (
          <div className="flex flex-1 min-w-0">
            <div className="flex flex-1 flex-col min-w-0">
            <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-4 lg:px-6">
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
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{thread.contactName ?? thread.contactPhone}</p>
                <p className="truncate text-xs text-muted-foreground">{thread.contactPhone}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {thread.lead?.score != null && thread.lead.score > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Score {thread.lead.score}
                  </span>
                )}
                {thread.lead && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {formatStage(thread.lead.stage)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-muted/20 px-6 py-4 custom-scrollbar">
              <div className="mx-auto flex max-w-2xl flex-col gap-3">
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                      m.direction === "OUTBOUND"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted",
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content ?? "—"}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        m.direction === "OUTBOUND" ? "text-primary-foreground/70" : "text-muted-foreground",
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

            <form onSubmit={handleSend} className="border-t border-border bg-background p-4">
              {sendError && (
                <p className="mb-2 text-center text-xs text-destructive">{sendError}</p>
              )}
              {capabilities?.aiSuggestReply && (
                <div className="mx-auto mb-2 flex max-w-2xl justify-end">
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
                    Suggest reply
                  </Button>
                </div>
              )}
              <div className="mx-auto flex max-w-2xl gap-2">
                <Input
                  placeholder="Type your reply…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={sendMutation.isPending || !thread.whatsappAccount.isActive}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim() || sendMutation.isPending || !thread.whatsappAccount.isActive}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
            </div>

            {thread.lead && (
              <aside className="hidden w-72 shrink-0 flex-col border-l border-border lg:flex">
                <div className="border-b border-border p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Lead timeline</h2>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    AI classification and pipeline changes after each message
                  </p>
                  {timeline?.lead.aiConfidence != null && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      AI confidence: {Math.round(timeline.lead.aiConfidence * 100)}%
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {!timeline?.events.length && (
                    <p className="text-xs text-muted-foreground">
                      Timeline fills in after the next customer message is classified.
                    </p>
                  )}
                  <ul className="space-y-3">
                    {timeline?.events.map((ev) => (
                      <li key={ev.id} className="relative border-l-2 border-border pl-3">
                        <p className="text-xs font-medium">
                          {ev.type === "ai_classify" ? "🤖 " : "📊 "}
                          {ev.title}
                        </p>
                        {ev.detail && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{ev.detail}</p>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground">
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
