"use client";

import { Inbox, MessageSquare, Plus, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface InboxConversationRow {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastMessageAt: string | null;
  requiresHuman?: boolean;
  lead: { id: string; stage: string } | null;
  messages: Array<{ content: string | null }>;
}

const QUEUE_FILTERS: InboxListFilter[] = [
  "all",
  "handoff",
  "unread",
  "unassigned",
  "mine",
];

function formatListTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function InboxConversationList({
  conversations,
  selectedId,
  search,
  onSearchChange,
  hasWhatsapp,
  live,
  listLoading,
  listError,
  onRetry,
  onSelect,
  onNewMessage,
  listFilter = "all",
  listScope = "active",
  onListFilterChange,
  onListScopeChange,
  yourTurnCount,
}: {
  conversations: InboxConversationRow[];
  selectedId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  hasWhatsapp: boolean;
  live: boolean;
  listLoading: boolean;
  listError: boolean;
  onRetry: () => void;
  onSelect: (id: string) => void;
  onNewMessage?: () => void;
  listFilter?: InboxListFilter;
  listScope?: InboxListScope;
  onListFilterChange?: (f: InboxListFilter) => void;
  onListScopeChange?: (s: InboxListScope) => void;
  yourTurnCount?: number;
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

  return (
    <aside className="relative flex h-full w-full shrink-0 flex-col border-r border-border/80 bg-[#f8f9ff] md:w-[min(100%,320px)] lg:w-[360px]">
      <div className="shrink-0 border-b border-border/80 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {copy.messagingEyebrow}
            </p>
            <h1 className="text-base font-bold tracking-tight">{t("nav.conversations")}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {hasWhatsapp && (
              <span className="rounded-full bg-bento-mint px-2 py-0.5 text-[9px] font-bold uppercase text-accent">
                {copy.live}
              </span>
            )}
            {live && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" title="Realtime sync" />
            )}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {copy.conversationCount(conversations.length)}
        </p>

        {hasWhatsapp && onListScopeChange && (
          <div className="mt-2.5 flex rounded-lg bg-muted/60 p-0.5">
            {(["active", "closed"] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => onListScopeChange(scope)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-[11px] font-semibold transition",
                  listScope === scope
                    ? "bg-white text-foreground shadow-sm"
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
              className="h-8 rounded-lg border-border/80 bg-[#f8f9ff] pl-9 text-xs"
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
              const count = id === "handoff" ? yourTurnCount : undefined;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onListFilterChange(id)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition",
                    active
                      ? id === "handoff"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-accent text-white shadow-sm"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {filterLabel[id]}
                  {count != null && count > 0 ? ` · ${count}` : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        {listLoading && (
          <div className="p-2">
            <InboxListSkeleton />
          </div>
        )}

        {listError && !listLoading && (
          <div className="p-3">
            <QueryErrorState onRetry={onRetry} />
          </div>
        )}

        {!listLoading && !listError && !hasWhatsapp && (
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

        <ul className="divide-y divide-border/50">
          {conversations.map((c) => {
            const displayName = c.contactName ?? c.contactPhone;
            const active = selectedId === c.id;
            const closed = listScope === "closed";
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                    active
                      ? "border-l-[3px] border-l-accent bg-white"
                      : "border-l-[3px] border-l-transparent hover:bg-white/70",
                    closed && !active && "opacity-80",
                  )}
                >
                  <AvatarInitials name={displayName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm font-semibold", active && "text-accent")}>
                        {displayName}
                      </p>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {formatListTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {c.messages[0]?.content ?? "—"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {c.requiresHuman && listScope === "active" && (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          {copy.waitingOnYou}
                        </span>
                      )}
                      {c.lead && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {copy.stageLabel(c.lead.stage)}
                        </span>
                      )}
                      {c.unreadCount > 0 && (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {onNewMessage && hasWhatsapp && listScope === "active" && (
        <div className="shrink-0 border-t border-border/80 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-10 w-full gap-2 rounded-xl bg-accent text-sm font-semibold shadow-sm hover:bg-accent-hover"
            onClick={onNewMessage}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            {copy.newMessage}
          </Button>
        </div>
      )}
    </aside>
  );
}
