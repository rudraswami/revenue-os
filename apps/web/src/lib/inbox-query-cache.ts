import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-config";

export const OPTIMISTIC_MESSAGE_PREFIX = "optimistic-";

export interface InboxListRow {
  id: string;
  unreadCount: number;
  lastMessageAt: string | null;
  requiresHuman?: boolean;
  messages: Array<{ content: string | null }>;
  lead: { id: string; stage: string } | null;
}

export interface InboxThreadMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content: string | null;
  createdAt: string;
  status: string;
  sentByAi?: boolean;
}

export interface InboxThreadCache {
  id: string;
  unreadCount: number;
  requiresHuman?: boolean;
  handoffReason?: string | null;
  messages: InboxThreadMessage[];
  lead?: { id: string; stage: string; score?: number } | null;
}

export interface ConversationStatsCache {
  unreadMessages?: number;
  humanHandoffRecommended?: number;
  queue?: {
    yourTurn?: number;
    mine?: number;
    unassigned?: number;
    postCloseUnread?: number;
  };
}

const STATS_KEYS = [
  QUERY_KEYS.conversationStats(),
  QUERY_KEYS.conversationQueueStats,
] as const;

function patchConversationStatsCaches(
  queryClient: QueryClient,
  patcher: (old: ConversationStatsCache | undefined) => ConversationStatsCache | undefined,
): void {
  for (const key of STATS_KEYS) {
    queryClient.setQueryData<ConversationStatsCache>(key, patcher);
  }
}

/** Mark a conversation read in list, thread, and sidebar stats caches. */
export function patchConversationAsRead(
  queryClient: QueryClient,
  conversationId: string,
): void {
  let clearedUnread = 0;

  const thread = queryClient.getQueryData<InboxThreadCache>(["conversation", conversationId]);
  if (thread && thread.unreadCount > 0) {
    clearedUnread = thread.unreadCount;
    queryClient.setQueryData<InboxThreadCache>(["conversation", conversationId], {
      ...thread,
      unreadCount: 0,
    });
  }

  const listEntries = queryClient.getQueriesData<{ data: InboxListRow[] }>({
    queryKey: ["conversations"],
  });

  for (const [key, cached] of listEntries) {
    if (!cached?.data) continue;
    const row = cached.data.find((c) => c.id === conversationId);
    if (!row || row.unreadCount === 0) continue;
    if (!clearedUnread) clearedUnread = row.unreadCount;
    queryClient.setQueryData(key, {
      ...cached,
      data: cached.data.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    });
  }

  if (clearedUnread <= 0) return;

  patchConversationStatsCaches(queryClient, (old) => {
    if (!old) return old;
    return {
      ...old,
      unreadMessages: Math.max(0, (old.unreadMessages ?? 0) - clearedUnread),
    };
  });
}

export function createOptimisticOutboundMessage(content: string, optimisticId: string): InboxThreadMessage {
  return {
    id: optimisticId,
    direction: "OUTBOUND",
    type: "TEXT",
    content,
    createdAt: new Date().toISOString(),
    status: "PENDING",
  };
}

export function appendOptimisticOutboundMessage(
  queryClient: QueryClient,
  conversationId: string,
  message: InboxThreadMessage,
): InboxThreadCache | undefined {
  const thread = queryClient.getQueryData<InboxThreadCache>(["conversation", conversationId]);
  if (!thread) return undefined;

  const next: InboxThreadCache = {
    ...thread,
    messages: [...thread.messages, message],
  };
  queryClient.setQueryData(["conversation", conversationId], next);
  return next;
}

export function replaceOptimisticOutboundMessage(
  queryClient: QueryClient,
  conversationId: string,
  optimisticId: string,
  serverMessage: InboxThreadMessage,
): void {
  const thread = queryClient.getQueryData<InboxThreadCache>(["conversation", conversationId]);
  if (!thread) return;

  queryClient.setQueryData<InboxThreadCache>(["conversation", conversationId], {
    ...thread,
    messages: thread.messages.map((m) => (m.id === optimisticId ? serverMessage : m)),
  });
}

export function patchConversationHandoffResolved(
  queryClient: QueryClient,
  conversationId: string,
): void {
  const thread = queryClient.getQueryData<InboxThreadCache>(["conversation", conversationId]);
  if (thread?.requiresHuman) {
    queryClient.setQueryData<InboxThreadCache>(["conversation", conversationId], {
      ...thread,
      requiresHuman: false,
      handoffReason: null,
    });
  }

  const listEntries = queryClient.getQueriesData<{ data: InboxListRow[] }>({
    queryKey: ["conversations"],
  });

  for (const [key, cached] of listEntries) {
    if (!cached?.data) continue;
    const row = cached.data.find((c) => c.id === conversationId);
    if (!row?.requiresHuman) continue;
    queryClient.setQueryData(key, {
      ...cached,
      data: cached.data.map((c) =>
        c.id === conversationId ? { ...c, requiresHuman: false } : c,
      ),
    });
  }

  patchConversationStatsCaches(queryClient, (old) => {
    if (!old) return old;
    return {
      ...old,
      humanHandoffRecommended: Math.max(0, (old.humanHandoffRecommended ?? 0) - 1),
      queue: old.queue
        ? {
            ...old.queue,
            yourTurn: Math.max(0, (old.queue.yourTurn ?? 0) - 1),
          }
        : old.queue,
    };
  });
}

export function patchThreadLeadStage(
  queryClient: QueryClient,
  conversationId: string,
  stage: string,
): void {
  const thread = queryClient.getQueryData<InboxThreadCache>(["conversation", conversationId]);
  if (thread?.lead) {
    queryClient.setQueryData<InboxThreadCache>(["conversation", conversationId], {
      ...thread,
      lead: { ...thread.lead, stage },
    });
  }

  const listEntries = queryClient.getQueriesData<{ data: InboxListRow[] }>({
    queryKey: ["conversations"],
  });

  for (const [key, cached] of listEntries) {
    if (!cached?.data) continue;
    const row = cached.data.find((c) => c.id === conversationId);
    if (!row?.lead) continue;
    queryClient.setQueryData(key, {
      ...cached,
      data: cached.data.map((c) =>
        c.id === conversationId && c.lead
          ? { ...c, lead: { ...c.lead, stage } }
          : c,
      ),
    });
  }
}

export function patchConversationListsAfterOutbound(
  queryClient: QueryClient,
  conversationId: string,
  content: string,
  createdAt: string,
): void {
  const listEntries = queryClient.getQueriesData<{ data: InboxListRow[] }>({
    queryKey: ["conversations"],
  });

  for (const [key, cached] of listEntries) {
    if (!cached?.data) continue;
    const idx = cached.data.findIndex((c) => c.id === conversationId);
    if (idx < 0) continue;

    const updated: InboxListRow = {
      ...cached.data[idx],
      lastMessageAt: createdAt,
      messages: [{ content }],
      unreadCount: 0,
    };
    const nextData = [...cached.data];
    nextData.splice(idx, 1);
    nextData.unshift(updated);

    queryClient.setQueryData(key, { ...cached, data: nextData });
  }
}

export function prependOlderMessages(
  queryClient: QueryClient,
  conversationId: string,
  olderMessages: InboxThreadMessage[],
  hasOlderMessages: boolean,
): void {
  const thread = queryClient.getQueryData<InboxThreadCache & { hasOlderMessages?: boolean }>([
    "conversation",
    conversationId,
  ]);
  if (!thread) return;

  const existingIds = new Set(thread.messages.map((m) => m.id));
  const uniqueOlder = olderMessages.filter((m) => !existingIds.has(m.id));

  queryClient.setQueryData(["conversation", conversationId], {
    ...thread,
    messages: [...uniqueOlder, ...thread.messages],
    hasOlderMessages,
  });
}
