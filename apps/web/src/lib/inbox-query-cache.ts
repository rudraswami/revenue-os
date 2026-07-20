import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-config";
import { syncInboxThreadBundleConversation } from "./inbox-thread-bundle";
import {
  bumpConversationListRow,
  patchConversationListRow,
  updateConversationListCaches,
} from "./inbox-list-cache";

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

  const thread = queryClient.getQueryData<InboxThreadCache>(QUERY_KEYS.conversation(conversationId));
  if (thread && thread.unreadCount > 0) {
    clearedUnread = thread.unreadCount;
    syncInboxThreadBundleConversation(queryClient, conversationId, {
      ...thread,
      unreadCount: 0,
    });
  }

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
    if (!row || row.unreadCount === 0) return null;
    if (!clearedUnread) clearedUnread = row.unreadCount;
    return patchConversationListRow(cached, conversationId, (r) => ({
      ...r,
      unreadCount: 0,
    }));
  });

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
  const thread = queryClient.getQueryData<InboxThreadCache>(QUERY_KEYS.conversation(conversationId));
  if (!thread) return undefined;

  const next: InboxThreadCache = {
    ...thread,
    messages: [...thread.messages, message],
  };
  syncInboxThreadBundleConversation(queryClient, conversationId, next);
  return next;
}

export function replaceOptimisticOutboundMessage(
  queryClient: QueryClient,
  conversationId: string,
  optimisticId: string,
  serverMessage: InboxThreadMessage,
): void {
  const thread = queryClient.getQueryData<InboxThreadCache>(QUERY_KEYS.conversation(conversationId));
  if (!thread) return;

  syncInboxThreadBundleConversation(queryClient, conversationId, {
    ...thread,
    messages: thread.messages.map((m) => (m.id === optimisticId ? serverMessage : m)),
  });
}

export function patchConversationHandoffResolved(
  queryClient: QueryClient,
  conversationId: string,
): void {
  const thread = queryClient.getQueryData<InboxThreadCache>(QUERY_KEYS.conversation(conversationId));
  if (thread?.requiresHuman) {
    syncInboxThreadBundleConversation(queryClient, conversationId, {
      ...thread,
      requiresHuman: false,
      handoffReason: null,
    });
  }

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
    if (!row?.requiresHuman) return null;
    return patchConversationListRow(cached, conversationId, (r) => ({
      ...r,
      requiresHuman: false,
    }));
  });

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
  const thread = queryClient.getQueryData<InboxThreadCache>(QUERY_KEYS.conversation(conversationId));
  if (thread?.lead) {
    syncInboxThreadBundleConversation(queryClient, conversationId, {
      ...thread,
      lead: { ...thread.lead, stage },
    });
  }

  updateConversationListCaches(queryClient, (cached) =>
    patchConversationListRow(cached, conversationId, (row) =>
      row.lead ? { ...row, lead: { ...row.lead, stage } } : row,
    ),
  );
}

export function patchConversationListsAfterOutbound(
  queryClient: QueryClient,
  conversationId: string,
  content: string,
  createdAt: string,
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
      lastMessageAt: createdAt,
      messages: [{ content }],
      unreadCount: 0,
    };
    return bumpConversationListRow(cached, conversationId, updated);
  });
}

export function prependOlderMessages(
  queryClient: QueryClient,
  conversationId: string,
  olderMessages: InboxThreadMessage[],
  hasOlderMessages: boolean,
): void {
  const thread = queryClient.getQueryData<InboxThreadCache & { hasOlderMessages?: boolean }>(
    QUERY_KEYS.conversation(conversationId),
  );
  if (!thread) return;

  const existingIds = new Set(thread.messages.map((m) => m.id));
  const uniqueOlder = olderMessages.filter((m) => !existingIds.has(m.id));

  syncInboxThreadBundleConversation(queryClient, conversationId, {
    ...thread,
    messages: [...uniqueOlder, ...thread.messages],
    hasOlderMessages,
  });
}
