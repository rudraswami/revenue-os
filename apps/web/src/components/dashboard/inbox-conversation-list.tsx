"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Inbox, MessageSquare, Plus, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { InboxListSkeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-state";
import {
  useConversationsCopy,
  type InboxListFilter,
  type InboxListScope,
} from "@/lib/i18n/conversations-copy";
import { useI18n } from "@/lib/i18n/locale-provider";
import { FilterChip } from "@/components/ui/filter-chip";
import { InboxConversationRowItem, INBOX_LIST_ROW_HEIGHT } from "@/components/dashboard/inbox-conversation-row";
import { cn } from "@/lib/utils";

export interface InboxConversationRow {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastMessageAt: string | null;
  requiresHuman?: boolean;
  postCloseAttention?: boolean;
  lead: { id: string; stage: string; score?: number; valueCents?: number | null } | null;
  messages: Array<{ content: string | null }>;
}

const QUEUE_FILTERS: InboxListFilter[] = [
  "all",
  "handoff",
  "unread",
  "unassigned",
  "mine",
];

export function InboxConversationList({
  conversations,
  selectedId,
  search,
  onSearchChange,
  hasWhatsapp,
  showWhatsappDisconnected = false,
  live,
  listLoading,
  listError,
  onRetry,
  onSelect,
  onConversationHover,
  onNewMessage,
  listFilter = "all",
  listScope = "active",
  onListFilterChange,
  onListScopeChange,
  queueCounts,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  listTotal,
}: {
  conversations: InboxConversationRow[];
  selectedId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  hasWhatsapp: boolean;
  /** Only true when API confirms no active WA — not while shell cache is loading. */
  showWhatsappDisconnected?: boolean;
  live: boolean;
  listLoading: boolean;
  listError: boolean;
  onRetry: () => void;
  onSelect: (id: string) => void;
  onConversationHover?: (id: string) => void;
  onNewMessage?: () => void;
  listFilter?: InboxListFilter;
  listScope?: InboxListScope;
  onListFilterChange?: (f: InboxListFilter) => void;
  onListScopeChange?: (s: InboxListScope) => void;
  queueCounts?: {
    yourTurn: number;
    mine: number;
    unassigned: number;
    postCloseUnread?: number;
  };
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  listTotal?: number;
}) {
  const { t } = useI18n();
  const copy = useConversationsCopy();

  const filterLabel: Record<InboxListFilter, string> = {
    all: copy.filterAll,
    handoff: copy.yourTurn,
    unread: copy.filterUnread,
    unassigned: copy.filterUnassigned,
    mine: copy.filterMine,
  };

  function emptyState() {
    if (listScope === "closed") {
      return { title: copy.emptyClosed, description: copy.emptyFilterHint };
    }
    if (listFilter === "handoff") {
      return { title: copy.emptyCaughtUp, description: copy.emptyFilterHint };
    }
    if (listFilter === "unread") {
      return { title: copy.emptyUnread, description: copy.emptyFilterHint };
    }
    if (listFilter === "unassigned") {
      return { title: copy.emptyUnassigned, description: copy.emptyFilterHint };
    }
    if (listFilter === "mine") {
      return { title: copy.emptyMine, description: copy.emptyFilterHint };
    }
    return { title: copy.emptyActive, description: copy.emptyStartHint };
  }

  const empty = emptyState();
  const showListSkeleton = listLoading && conversations.length === 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => INBOX_LIST_ROW_HEIGHT,
    overscan: 10,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasNextPage || !onLoadMore || isFetchingNextPage) return;

    function onScroll() {
      const { scrollTop, scrollHeight, clientHeight } = el!;
      if (scrollHeight - scrollTop - clientHeight < 200) onLoadMore!();
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasNextPage, isFetchingNextPage, onLoadMore, conversations.length]);

  useEffect(() => {
    if (!selectedId) return;
    const index = conversations.findIndex((c) => c.id === selectedId);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "auto" });
    }
  }, [selectedId, conversations, virtualizer]);

  const countLabel =
    listTotal != null && listTotal > conversations.length
      ? `${conversations.length} of ${listTotal}`
      : copy.conversationCount(conversations.length);

  return (
    <aside className="relative flex h-full w-full shrink-0 flex-col border-r border-border/80 bg-background md:w-[min(100%,320px)] lg:w-[360px]">
      <div className="shrink-0 border-b border-border/80 bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-accent">
              {copy.messagingEyebrow}
            </p>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">{t("nav.conversations")}</h1>
          </div>
          {hasWhatsapp && live && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-accent animate-pulse"
              title="Realtime updates on"
              aria-label="Realtime updates on"
            />
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {countLabel}
          {hasWhatsapp && !live && (
            <span className="text-muted-foreground/80"> · checking for updates</span>
          )}
        </p>

        {hasWhatsapp && onListScopeChange && (
          <div className="mt-2.5 flex rounded-lg bg-muted/60 p-0.5">
            {(["active", "closed"] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => onListScopeChange(scope)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-semibold transition",
                  listScope === scope
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {scope === "active" ? copy.scopeActive : copy.scopeClosed}
              </button>
            ))}
          </div>
        )}

        {hasWhatsapp && (
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-8 rounded-lg border-border/80 bg-background pl-9 text-xs"
            />
          </div>
        )}

        {onListFilterChange && hasWhatsapp && (
          <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
            {(listScope === "closed"
              ? QUEUE_FILTERS.filter((id) => id !== "handoff")
              : QUEUE_FILTERS
            ).map((id) => {
              const active = listFilter === id;
              const count =
                id === "handoff"
                  ? queueCounts?.yourTurn
                  : id === "mine"
                    ? queueCounts?.mine
                    : id === "unassigned"
                      ? queueCounts?.unassigned
                      : undefined;
              return (
                <FilterChip
                  key={id}
                  active={active}
                  attention={id === "handoff"}
                  count={count}
                  onClick={() => onListFilterChange(id)}
                >
                  {filterLabel[id]}
                </FilterChip>
              );
            })}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        {showListSkeleton && (
          <div className="p-2">
            <InboxListSkeleton />
          </div>
        )}

        {listError && !listLoading && (
          <div className="p-3">
            <QueryErrorState onRetry={onRetry} />
          </div>
        )}

        {!listLoading && !listError && showWhatsappDisconnected && (
          <div className="p-3">
            <EmptyState
              compact
              icon={<MessageSquare className="h-6 w-6" />}
              title={copy.whatsappNotConnected}
              description={copy.whatsappNotConnectedHint}
              actionHref="/onboarding"
              actionLabel={copy.connectWhatsapp}
            />
          </div>
        )}

        {!listLoading && !listError && hasWhatsapp && conversations.length === 0 && (
          <div className="p-3">
            <EmptyState
              compact
              icon={<Inbox className="h-6 w-6" />}
              title={empty.title}
              description={empty.description}
              action={
                listFilter === "all" && listScope === "active" && onNewMessage ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 rounded-lg bg-accent hover:bg-accent-hover"
                    onClick={onNewMessage}
                  >
                    <Plus className="h-4 w-4" />
                    {copy.newMessage}
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {conversations.length > 0 && (
          <ul
            className="relative"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const c = conversations[virtualRow.index];
              return (
                <li
                  key={c.id}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    height: `${INBOX_LIST_ROW_HEIGHT}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <InboxConversationRowItem
                    conversation={c}
                    active={selectedId === c.id}
                    closed={listScope === "closed"}
                    onSelect={onSelect}
                    onHover={onConversationHover}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {isFetchingNextPage && (
          <p className="py-3 text-center text-xs text-muted-foreground">Loading more…</p>
        )}
      </div>

      {onNewMessage && hasWhatsapp && listScope === "active" && (
        <div className="shrink-0 border-t border-border/80 bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-10 w-full gap-2 rounded-xl bg-accent text-sm font-semibold shadow-sm hover:bg-accent-hover"
            onClick={onNewMessage}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-card/20">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            {copy.newMessage}
          </Button>
        </div>
      )}
    </aside>
  );
}
