"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "@/lib/api-client";
import type { InboxListPage } from "@/lib/inbox-list-cache";
import type { InboxConversationRow } from "@/components/dashboard/inbox-conversation-list";
import { QUERY_KEYS } from "@/lib/query-config";
import type { InboxListFilter, InboxListScope } from "@/lib/i18n/conversations-copy";

const INBOX_PAGE_SIZE = 50;

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
  const query = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.conversationsList, searchDebounced, listFilter, listScope],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        pageSize: String(INBOX_PAGE_SIZE),
        page: String(pageParam),
      });
      if (searchDebounced) params.set("q", searchDebounced);
      if (listFilter !== "all") params.set("filter", listFilter);
      if (listScope === "closed") params.set("scope", "closed");
      return apiFetch<InboxListPage>(`/conversations?${params}`, {
        token: token ?? undefined,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    enabled: !!token,
    refetchInterval,
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
