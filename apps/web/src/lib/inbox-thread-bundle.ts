import type { QueryClient } from "@tanstack/react-query";
import type { ReplyDecision, WorkingMemory } from "@growvisi/shared";
import type { KnowledgeHealthSummary } from "@growvisi/shared";
import { QUERY_KEYS } from "@/lib/query-config";

/** Read conversation id from React Query thread bundle key. */
export function conversationIdFromThreadKey(queryKey: readonly unknown[]): string | undefined {
  return queryKey[0] === "conversation-thread" && typeof queryKey[1] === "string"
    ? queryKey[1]
    : undefined;
}

export interface InboxContextPayload {
  workingMemory?: WorkingMemory;
  replyDecision?: ReplyDecision | null;
  kbHealth?: KnowledgeHealthSummary;
  knowledgeGaps?: string[];
}

/** API response for GET /conversations/:id/thread */
export interface InboxThreadBundle<TConversation = unknown> {
  conversation: TConversation;
  inboxContext: InboxContextPayload;
}

/** Seed thread bundle + legacy per-slice caches (mutations still patch conversation). */
export function seedInboxThreadBundleCache(
  queryClient: QueryClient,
  conversationId: string,
  bundle: InboxThreadBundle,
): void {
  queryClient.setQueryData(QUERY_KEYS.conversationThread(conversationId), bundle);
  queryClient.setQueryData(QUERY_KEYS.conversation(conversationId), bundle.conversation);
  queryClient.setQueryData(QUERY_KEYS.conversationInboxContext(conversationId), bundle.inboxContext);
}

/** Keep bundle.conversation in sync when patching the legacy conversation cache. */
export function syncInboxThreadBundleConversation<TConversation>(
  queryClient: QueryClient,
  conversationId: string,
  conversation: TConversation,
): void {
  queryClient.setQueryData(QUERY_KEYS.conversation(conversationId), conversation);
  const bundle = queryClient.getQueryData<InboxThreadBundle<TConversation>>(
    QUERY_KEYS.conversationThread(conversationId),
  );
  if (bundle) {
    queryClient.setQueryData(QUERY_KEYS.conversationThread(conversationId), {
      ...bundle,
      conversation,
    });
  }
}

/** Keep bundle.inboxContext in sync when AI context changes without full refetch. */
export function syncInboxThreadBundleInboxContext(
  queryClient: QueryClient,
  conversationId: string,
  inboxContext: InboxContextPayload,
): void {
  queryClient.setQueryData(QUERY_KEYS.conversationInboxContext(conversationId), inboxContext);
  const bundle = queryClient.getQueryData<InboxThreadBundle>(
    QUERY_KEYS.conversationThread(conversationId),
  );
  if (bundle) {
    queryClient.setQueryData(QUERY_KEYS.conversationThread(conversationId), {
      ...bundle,
      inboxContext,
    });
  }
}

export function invalidateInboxThreadQueries(
  queryClient: QueryClient,
  conversationId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversationThread(conversationId) });
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
  void queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.conversationInboxContext(conversationId),
  });
}

export async function cancelInboxThreadQueries(
  queryClient: QueryClient,
  conversationId: string,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversationThread(conversationId) });
  await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversation(conversationId) });
}
