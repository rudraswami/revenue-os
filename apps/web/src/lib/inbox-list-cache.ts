import type { InfiniteData } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-config";
import type { InboxListRow } from "./inbox-query-cache";

export interface InboxListPage {
  data: InboxListRow[];
  hasMore?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
}

function isInfiniteListCache(
  cached: InboxListPage | InfiniteData<InboxListPage>,
): cached is InfiniteData<InboxListPage> {
  return "pages" in cached;
}

function findRowIndex(pages: InboxListPage[], conversationId: string): {
  pageIndex: number;
  rowIndex: number;
} | null {
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const rowIndex = pages[pageIndex].data.findIndex((c) => c.id === conversationId);
    if (rowIndex >= 0) return { pageIndex, rowIndex };
  }
  return null;
}

/** Iterate every cached conversation list (flat or infinite) and apply a patcher. */
export function updateConversationListCaches(
  queryClient: QueryClient,
  patcher: (cached: InboxListPage | InfiniteData<InboxListPage>) => InboxListPage | InfiniteData<InboxListPage> | null,
): void {
  const entries = queryClient.getQueriesData<InboxListPage | InfiniteData<InboxListPage>>({
    queryKey: QUERY_KEYS.conversationsList,
  });

  for (const [key, cached] of entries) {
    if (!cached) continue;
    const hasRows = isInfiniteListCache(cached)
      ? cached.pages.some((p) => p.data.length > 0)
      : cached.data.length > 0;
    if (!hasRows && isInfiniteListCache(cached) && cached.pages.length === 0) continue;
    if (!hasRows && !isInfiniteListCache(cached)) continue;

    const next = patcher(cached);
    if (next) queryClient.setQueryData(key, next);
  }
}

export function patchConversationListRow(
  cached: InboxListPage | InfiniteData<InboxListPage>,
  conversationId: string,
  mapRow: (row: InboxListRow) => InboxListRow,
): InboxListPage | InfiniteData<InboxListPage> | null {
  if (isInfiniteListCache(cached)) {
    const loc = findRowIndex(cached.pages, conversationId);
    if (!loc) return null;
    const pages = cached.pages.map((page, pageIndex) => {
      if (pageIndex !== loc.pageIndex) return page;
      return {
        ...page,
        data: page.data.map((row, rowIndex) =>
          rowIndex === loc.rowIndex ? mapRow(row) : row,
        ),
      };
    });
    return { ...cached, pages };
  }

  const rowIndex = cached.data.findIndex((c) => c.id === conversationId);
  if (rowIndex < 0) return null;
  return {
    ...cached,
    data: cached.data.map((row, idx) => (idx === rowIndex ? mapRow(row) : row)),
  };
}

/** Move a conversation to the top of the first page (after send / inbound activity). */
export function bumpConversationListRow(
  cached: InboxListPage | InfiniteData<InboxListPage>,
  conversationId: string,
  updated: InboxListRow,
): InboxListPage | InfiniteData<InboxListPage> | null {
  if (isInfiniteListCache(cached)) {
    const loc = findRowIndex(cached.pages, conversationId);
    if (!loc) return null;

    const pages = cached.pages.map((page) => ({
      ...page,
      data: page.data.filter((c) => c.id !== conversationId),
    }));
    pages[0] = {
      ...pages[0],
      data: [updated, ...pages[0].data],
    };
    return { ...cached, pages };
  }

  const idx = cached.data.findIndex((c) => c.id === conversationId);
  if (idx < 0) return null;
  const nextData = cached.data.filter((c) => c.id !== conversationId);
  nextData.unshift(updated);
  return { ...cached, data: nextData };
}
