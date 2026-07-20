import { apiFetch } from "@/lib/api-client";
import type { InboxListFilter, InboxListScope } from "@/lib/i18n/conversations-copy";
import type { InboxListPage } from "@/lib/inbox-list-cache";
import { QUERY_KEYS } from "@/lib/query-config";

export const INBOX_LIST_PAGE_SIZE = 50;
export const INBOX_LIST_INITIAL_PAGE = 1;

export function inboxListQueryKey(
  searchDebounced: string,
  listFilter: InboxListFilter,
  listScope: InboxListScope,
) {
  return [...QUERY_KEYS.conversationsList, searchDebounced, listFilter, listScope] as const;
}

export function fetchInboxListPage({
  pageParam,
  token,
  searchDebounced,
  listFilter,
  listScope,
}: {
  pageParam: number;
  token: string | undefined;
  searchDebounced: string;
  listFilter: InboxListFilter;
  listScope: InboxListScope;
}) {
  const params = new URLSearchParams({
    pageSize: String(INBOX_LIST_PAGE_SIZE),
    page: String(pageParam),
  });
  if (searchDebounced) params.set("q", searchDebounced);
  if (listFilter !== "all") params.set("filter", listFilter);
  if (listScope === "closed") params.set("scope", "closed");
  return apiFetch<InboxListPage>(`/conversations?${params}`, { token });
}

export function inboxListNextPageParam(
  lastPage: InboxListPage,
  _pages: InboxListPage[],
  lastPageParam: number,
) {
  return lastPage.hasMore ? lastPageParam + 1 : undefined;
}
