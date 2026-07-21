import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-config";
import {
  type ConversationStatsCache,
  type InboxListRow,
  type InboxThreadMessage,
} from "./inbox-query-cache";
import { bumpConversationListRow, updateConversationListCaches } from "./inbox-list-cache";
import { syncInboxThreadBundleConversation } from "./inbox-thread-bundle";

export interface MessageNewRealtimePayload {
  conversationId: string;
  messageId?: string;
  direction?: "INBOUND" | "OUTBOUND";
  content?: string | null;
  createdAt?: string;
}

export interface MessageStatusRealtimePayload {
  conversationId: string;
  messageId: string;
  status: string;
}

/** Monotonic status ranking — mirrors the API so ticks never regress. */
const MESSAGE_STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
  FAILED: -1,
};

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

/** Bump list row on new activity — no blanket list invalidation. */
export function patchConversationListOnMessageActivity(
  queryClient: QueryClient,
  conversationId: string,
  preview: { content: string | null; createdAt: string },
  options: { incrementUnread?: boolean } = {},
): void {
  updateConversationListCaches(queryClient, (cached) => {
    let row: InboxListRow | undefined;
    if ("pages" in cached) {
      for (const page of cached.pages) {
        row = page.data.find((c) => c.id === conversationId);
        if (row) break;
      }
    } else {
      row = cached.data.find((c) => c.id === conversationId);
    }
    if (!row) return null;

    const updated: InboxListRow = {
      ...row,
      lastMessageAt: preview.createdAt,
      messages: [{ content: preview.content }],
      unreadCount: options.incrementUnread ? row.unreadCount + 1 : row.unreadCount,
    };
    return bumpConversationListRow(cached, conversationId, updated);
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
 * Patch a single message's delivery/read status in the open thread cache.
 * Returns true when the message exists in cache (whether or not it changed),
 * so callers can skip a thread refetch. Ranking prevents READ→DELIVERED
 * regressions from out-of-order webhooks; FAILED always applies.
 */
export function patchThreadMessageStatus(
  queryClient: QueryClient,
  payload: MessageStatusRealtimePayload,
): boolean {
  const { conversationId, messageId, status } = payload;
  if (!conversationId || !messageId || !status) return false;

  const thread = queryClient.getQueryData<{
    id: string;
    messages: InboxThreadMessage[];
    unreadCount: number;
  }>(QUERY_KEYS.conversation(conversationId));
  if (!thread) return false;

  const next = status.toUpperCase();
  let seen = false;
  let changed = false;

  const messages = thread.messages.map((m) => {
    if (m.id !== messageId) return m;
    seen = true;
    const currentRank = MESSAGE_STATUS_RANK[(m.status ?? "").toUpperCase()] ?? 0;
    const nextRank = MESSAGE_STATUS_RANK[next] ?? 0;
    if (next !== "FAILED" && nextRank <= currentRank) return m;
    changed = true;
    return { ...m, status: next };
  });

  if (!seen) return false;
  if (changed) {
    syncInboxThreadBundleConversation(queryClient, conversationId, {
      ...thread,
      messages,
    });
  }
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
