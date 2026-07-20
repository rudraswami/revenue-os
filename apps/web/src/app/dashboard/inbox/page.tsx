"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useConversationsCopy,
  type InboxListFilter,
  type InboxListScope,
} from "@/lib/i18n/conversations-copy";
import { InboxConversationList } from "@/components/dashboard/inbox-conversation-list";
import { InboxCommandPalette } from "@/components/dashboard/inbox-command-palette";
import { InboxThreadPane } from "@/components/dashboard/inbox-thread-pane";
import { OutboundCompose } from "@/components/dashboard/outbound-compose";
import { apiFetch } from "@/lib/api-client";
import { QUERY_KEYS } from "@/lib/query-config";
import { useShellWhatsappAccounts } from "@/hooks/use-shell-data";
import { useVisibleRefetchInterval } from "@/hooks/use-visible-refetch-interval";
import { useAuthStore } from "@/stores/auth-store";
import { canWrite } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  pickDailyQueueFilter,
  trackQueue,
} from "@/lib/conversation-queue-analytics";
import { patchConversationAsRead } from "@/lib/inbox-query-cache";
import { setActiveInboxConversationId } from "@/lib/inbox-active-thread";
import {
  refreshConversationLists,
  refreshQueueStats,
} from "@/lib/realtime-inbox-cache";
import { invalidateInboxThreadQueries } from "@/lib/inbox-thread-bundle";
import { prefetchInboxThread } from "@/lib/inbox-thread-prefetch";
import { useInboxConversationList } from "@/hooks/use-inbox-conversation-list";
import { useInboxKeyboard } from "@/hooks/use-inbox-keyboard";

export default function InboxPage() {
  const copy = useConversationsCopy();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canSend = canWrite(role);
  const queryClient = useQueryClient();
  const { connected: live } = useRealtime();
  const listPollInterval = useVisibleRefetchInterval(live ? 5_000 : 8_000);
  const statsPollInterval = useVisibleRefetchInterval(live ? 20_000 : 30_000);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showOutbound, setShowOutbound] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [listFilter, setListFilter] = useState<InboxListFilter>("all");
  const [listScope, setListScope] = useState<InboxListScope>("active");
  const [queueDefaultReady, setQueueDefaultReady] = useState(false);
  const queueDefaultedRef = useRef(false);
  const urlHadFilterRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setActiveInboxConversationId(selectedId);
    return () => setActiveInboxConversationId(null);
  }, [selectedId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) setSelectedId(c);
    const f = params.get("filter");
    if (f === "handoff" || f === "unread" || f === "unassigned" || f === "mine" || f === "all") {
      urlHadFilterRef.current = true;
      if (f !== "all") setListFilter(f);
    }
    const s = params.get("scope");
    if (s === "closed") setListScope("closed");
    setQueueDefaultReady(true);

    function onPopState() {
      const p = new URLSearchParams(window.location.search);
      setSelectedId(p.get("c"));
      const filter = p.get("filter");
      setListFilter(
        filter === "handoff" ||
          filter === "unread" ||
          filter === "unassigned" ||
          filter === "mine"
          ? filter
          : "all",
      );
      setListScope(p.get("scope") === "closed" ? "closed" : "active");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const {
    conversations,
    total: listTotal,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInboxConversationList({
    token,
    searchDebounced,
    listFilter,
    listScope,
    refetchInterval: listPollInterval,
  });

  const conversationIds = useMemo(
    () => conversations.map((c) => c.id),
    [conversations],
  );

  const { data: convStats } = useQuery({
    queryKey: QUERY_KEYS.conversationQueueStats,
    queryFn: () =>
      apiFetch<{
        humanHandoffRecommended: number;
        unreadMessages: number;
        queue?: { yourTurn: number; mine: number; unassigned: number };
      }>("/conversations/stats?scope=queue", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 15_000,
    refetchInterval: statsPollInterval,
  });

  const queueCounts = useMemo(
    () =>
      convStats?.queue ?? {
        yourTurn: convStats?.humanHandoffRecommended ?? 0,
        mine: 0,
        unassigned: 0,
        postCloseUnread: 0,
      },
    [convStats],
  );

  const { data: whatsappAccounts } = useShellWhatsappAccounts();
  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;

  useEffect(() => {
    if (!queueDefaultReady || !hasWhatsapp || queueDefaultedRef.current) return;
    if (urlHadFilterRef.current || selectedId) {
      queueDefaultedRef.current = true;
      return;
    }
    if (!convStats) return;
    queueDefaultedRef.current = true;
    const next = pickDailyQueueFilter(queueCounts);
    if (next === "all") return;
    setListFilter(next);
    const params = new URLSearchParams(window.location.search);
    params.set("filter", next);
    window.history.replaceState(null, "", `/dashboard/inbox?${params.toString()}`);
    trackQueue("queue_default_applied", { filter: next, yourTurn: queueCounts.yourTurn });
  }, [queueDefaultReady, hasWhatsapp, convStats, queueCounts, selectedId]);

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedId(id);
      patchConversationAsRead(queryClient, id);
      const params = new URLSearchParams(window.location.search);
      params.set("c", id);
      window.history.replaceState(null, "", `/dashboard/inbox?${params.toString()}`);
      void apiFetch(`/conversations/${id}/read`, {
        method: "POST",
        token: token ?? undefined,
      }).catch(() => {
        refreshConversationLists(queryClient);
        invalidateInboxThreadQueries(queryClient, id);
        refreshQueueStats(queryClient);
      });
    },
    [queryClient, token],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    window.history.replaceState(null, "", "/dashboard/inbox");
  }, []);

  useInboxKeyboard({
    enabled: hasWhatsapp,
    conversationIds,
    selectedId,
    onSelect: selectConversation,
    onClearSelection: clearSelection,
    onOpenCommandPalette: () => setCommandOpen(true),
  });

  function replaceInboxUrl(params: URLSearchParams) {
    const q = params.toString();
    window.history.replaceState(null, "", q ? `/dashboard/inbox?${q}` : "/dashboard/inbox");
  }

  function setInboxFilter(filter: InboxListFilter) {
    setListFilter(filter);
    trackQueue("queue_filter_click", { filter });
    const params = new URLSearchParams(window.location.search);
    if (filter !== "all") params.set("filter", filter);
    else params.delete("filter");
    replaceInboxUrl(params);
  }

  function setInboxScope(scope: InboxListScope) {
    const nextFilter =
      scope === "closed" && listFilter === "handoff" ? "all" : listFilter;
    if (nextFilter !== listFilter) setListFilter(nextFilter);
    setListScope(scope);

    const params = new URLSearchParams(window.location.search);
    if (scope === "closed") params.set("scope", "closed");
    else params.delete("scope");
    if (nextFilter !== "all") params.set("filter", nextFilter);
    else params.delete("filter");
    replaceInboxUrl(params);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-row overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_2px_16px_rgb(11_28_48/0.05)] max-lg:rounded-none max-lg:border-0 lg:mx-4 lg:mb-4 lg:mt-2">
        <div className={cn("h-full shrink-0", selectedId ? "max-md:hidden" : "flex", "md:flex")}>
          <InboxConversationList
            conversations={conversations}
            selectedId={selectedId}
            search={search}
            onSearchChange={setSearch}
            hasWhatsapp={hasWhatsapp}
            live={live}
            listLoading={listLoading}
            listError={listError}
            onRetry={() => void refetchList()}
            onSelect={selectConversation}
            onConversationHover={(id) => prefetchInboxThread(queryClient, id, token)}
            onNewMessage={canSend && hasWhatsapp ? () => setShowOutbound(true) : undefined}
            listFilter={listFilter}
            listScope={listScope}
            onListFilterChange={setInboxFilter}
            onListScopeChange={setInboxScope}
            queueCounts={queueCounts}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
            listTotal={listTotal}
          />
        </div>

        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-background/40",
            selectedId ? "flex" : "max-md:hidden",
            "md:flex",
          )}
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border/80">
                <Inbox className="h-7 w-7 text-accent" />
              </div>
              <div className="max-w-sm space-y-1">
                <h2 className="text-lg font-bold tracking-tight">
                  {queueCounts.yourTurn > 0 || queueCounts.mine > 0 || queueCounts.unassigned > 0
                    ? copy.dailyQueueTitle
                    : copy.selectTitle}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {queueCounts.yourTurn > 0 || queueCounts.mine > 0 || queueCounts.unassigned > 0
                    ? copy.dailyQueueHint
                    : copy.selectBody}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Press <kbd className="rounded border px-1">⌘K</kbd> to jump to a conversation
              </p>
            </div>
          ) : (
            <InboxThreadPane
              key={selectedId}
              conversationId={selectedId}
              listFilter={listFilter}
              peerConversationIds={conversationIds}
              onSelectConversation={selectConversation}
              onClearSelection={clearSelection}
              onShowOutbound={() => setShowOutbound(true)}
            />
          )}
        </div>
      </div>

      <InboxCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        conversations={conversations}
        selectedId={selectedId}
        listFilter={listFilter}
        listScope={listScope}
        queueCounts={queueCounts}
        onSelectConversation={selectConversation}
        onSetFilter={setInboxFilter}
        onSetScope={setInboxScope}
        onNewMessage={canSend && hasWhatsapp ? () => setShowOutbound(true) : undefined}
      />

      <OutboundCompose
        open={showOutbound}
        onClose={() => setShowOutbound(false)}
        onSent={(id) => selectConversation(id)}
      />
    </>
  );
}
