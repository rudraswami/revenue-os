"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  lead: { id: string; stage: string } | null;
  messages: Message[];
  whatsappAccount: { displayPhoneNumber: string; isActive: boolean };
}

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

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

  const { data: listData, isLoading: listLoading } = useQuery({
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

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || sendMutation.isPending) return;
    sendMutation.mutate(text);
  }

  return (
    <div className="flex h-screen">
      <div className="flex w-80 shrink-0 flex-col border-r border-border">
        <div className="border-b border-border p-4">
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

        <div className="flex-1 overflow-y-auto p-3">
          {listLoading && (
            <p className="text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
            </p>
          )}

          {!listLoading && !hasWhatsapp && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <p className="text-sm font-medium">WhatsApp not connected</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Link your business number to receive customer messages here.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/settings">Connect WhatsApp</Link>
              </Button>
            </div>
          )}

          {!listLoading && hasWhatsapp && conversations.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
              <p className="text-sm font-medium">No messages yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask someone to send a WhatsApp to your business number. It will show up here.
              </p>
            </div>
          )}

          <div className="space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-3 text-left transition-colors",
                  selectedId === c.id ? "bg-primary/15" : "hover:bg-muted/60",
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
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {c.messages[0]?.content ?? "No messages"}
                </p>
                {c.lead && (
                  <span className="mt-1 inline-block text-[10px] uppercase text-muted-foreground">
                    {STAGE_LABELS[c.lead.stage] ?? c.lead.stage}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <p className="text-sm">Select a conversation to read and reply</p>
            {hasWhatsapp && conversations.length > 0 && (
              <p className="text-xs">Choose a customer on the left</p>
            )}
          </div>
        ) : threadLoading && !thread ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : thread ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="font-semibold">{thread.contactName ?? thread.contactPhone}</p>
                <p className="text-xs text-muted-foreground">{thread.contactPhone}</p>
              </div>
              {thread.lead && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {STAGE_LABELS[thread.lead.stage] ?? thread.lead.stage}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
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

            <form onSubmit={handleSend} className="border-t border-border p-4">
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
          </>
        ) : null}
      </div>
    </div>
  );
}
