"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { InboxConversationRow } from "@/components/dashboard/inbox-conversation-list";
import { ensureInboxListInfiniteCache } from "@/lib/inbox-list-cache";
import {
  fetchInboxListPage,
  inboxListNextPageParam,
  inboxListQueryKey,
  INBOX_LIST_INITIAL_PAGE,
} from "@/lib/inbox-list-query";
import type { InboxListFilter, InboxListScope } from "@/lib/i18n/conversations-copy";

export function useInboxConversationList({
  token,
  searchDebounced,
  listFilter,
  listScope,
  refetchInterval,
}: {
  token: string | null;
  searchDebounced: string;
  listFilter: InboxListFilter;
  listScope: InboxListScope;
  refetchInterval: number | false;
}) {
  const queryClient = useQueryClient();
  const queryKey = inboxListQueryKey(searchDebounced, listFilter, listScope);

  // Legacy sidebar prefetch used prefetchQuery (flat shape) — migrate before infinite query reads cache.
  ensureInboxListInfiniteCache(queryClient, queryKey);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchInboxListPage({
        pageParam,
        token: token ?? undefined,
        searchDebounced,
        listFilter,
        listScope,
      }),
    initialPageParam: INBOX_LIST_INITIAL_PAGE,
    getNextPageParam: inboxListNextPageParam,
    enabled: !!token,
    refetchInterval,
    placeholderData: (prev) => prev,
  });

  const conversations = useMemo(
    () =>
      (query.data?.pages.flatMap((p) => p.data) ?? []) as InboxConversationRow[],
    [query.data?.pages],
  );

  const total = query.data?.pages[0]?.total;

  return {
    conversations,
    total,
    ...query,
  };
}
