import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-config";
import {
  type ConversationStatsCache,
  type InboxListRow,
  type InboxThreadMessage,
} from "./inbox-query-cache";
import { syncInboxThreadBundleConversation } from "./inbox-thread-bundle";

export interface MessageNewRealtimePayload {
  conversationId: string;
  messageId?: string;
  direction?: "INBOUND" | "OUTBOUND";
  content?: string | null;
  createdAt?: string;
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

function forEachConversationList<T extends { data: InboxListRow[] }>(
  queryClient: QueryClient,
  fn: (key: readonly unknown[], cached: T) => void,
): void {
  const entries = queryClient.getQueriesData<T>({ queryKey: QUERY_KEYS.conversationsList });
  for (const [key, cached] of entries) {
    if (!cached?.data) continue;
    fn(key, cached);
  }
}

/** Bump list row on new activity — no blanket list invalidation. */
export function patchConversationListOnMessageActivity(
  queryClient: QueryClient,
  conversationId: string,
  preview: { content: string | null; createdAt: string },
  options: { incrementUnread?: boolean } = {},
): void {
  forEachConversationList(queryClient, (key, cached) => {
    const idx = cached.data.findIndex((c) => c.id === conversationId);
    if (idx < 0) return;

    const row = cached.data[idx];
    const updated: InboxListRow = {
      ...row,
      lastMessageAt: preview.createdAt,
      messages: [{ content: preview.content }],
      unreadCount: options.incrementUnread
        ? row.unreadCount + 1
        : row.unreadCount,
    };
    const nextData = [...cached.data];
    nextData.splice(idx, 1);
    nextData.unshift(updated);
    queryClient.setQueryData(key, { ...cached, data: nextData });
  });
}

export function patchQueueStatsOnInbound(
  queryClient: QueryClient,
  options: { unreadDelta?: number; handoffDelta?: number } = {},
): void {
  const { unreadDelta = 0, handoffDelta = 0 } = options;
  if (unreadDelta === 0 && handoffDelta === 0) return;

  patchConversationStatsCaches(queryClient, (old) => {
    if (!old) return old;
    return {
      ...old,
      unreadMessages: Math.max(0, (old.unreadMessages ?? 0) + unreadDelta),
      humanHandoffRecommended: Math.max(
        0,
        (old.humanHandoffRecommended ?? 0) + handoffDelta,
      ),
      queue: old.queue
        ? {
            ...old.queue,
            yourTurn: Math.max(0, (old.queue.yourTurn ?? 0) + handoffDelta),
          }
        : old.queue,
    };
  });
}

/** Append inbound message to open thread cache when payload includes message fields. */
export function patchOpenThreadOnMessageNew(
  queryClient: QueryClient,
  conversationId: string,
  payload: MessageNewRealtimePayload,
): boolean {
  if (!payload.messageId || !payload.direction) return false;

  const thread = queryClient.getQueryData<{
    id: string;
    messages: InboxThreadMessage[];
    unreadCount: number;
  }>(QUERY_KEYS.conversation(conversationId));
  if (!thread) return false;

  if (thread.messages.some((m) => m.id === payload.messageId)) return true;

  const message: InboxThreadMessage = {
    id: payload.messageId,
    direction: payload.direction,
    type: "TEXT",
    content: payload.content ?? null,
    createdAt: payload.createdAt ?? new Date().toISOString(),
    status: payload.direction === "INBOUND" ? "DELIVERED" : "SENT",
  };

  syncInboxThreadBundleConversation(queryClient, conversationId, {
    ...thread,
    messages: [...thread.messages, message],
    unreadCount: payload.direction === "INBOUND" ? thread.unreadCount + 1 : thread.unreadCount,
  });
  return true;
}

/**
 * TB-2: targeted realtime handling for message.new — patch list + stats;
 * patch open thread when possible, otherwise invalidate that thread only.
 */
export function handleMessageNewCacheUpdate(
  queryClient: QueryClient,
  payload: MessageNewRealtimePayload,
  options: { activeConversationId?: string | null } = {},
): void {
  const { conversationId } = payload;
  if (!conversationId) return;

  const createdAt = payload.createdAt ?? new Date().toISOString();
  const isInbound = payload.direction !== "OUTBOUND";
  const isActive = conversationId === options.activeConversationId;

  patchConversationListOnMessageActivity(
    queryClient,
    conversationId,
    { content: payload.content ?? null, createdAt },
    { incrementUnread: isInbound && !isActive },
  );

  if (isInbound && !isActive) {
    patchQueueStatsOnInbound(queryClient, { unreadDelta: 1 });
  }

  if (isActive && patchOpenThreadOnMessageNew(queryClient, conversationId, payload)) {
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.conversationThread(conversationId),
    refetchType: "active",
  });
}

/** Scoped list refresh when bulk server mutations affect unknown rows. */
export function refreshConversationLists(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.conversationsList,
    refetchType: "active",
  });
}

export function refreshQueueStats(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversationQueueStats });
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversationStats() });
}
