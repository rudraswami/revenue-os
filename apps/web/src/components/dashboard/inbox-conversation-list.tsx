"use client";

import { Inbox, MessageSquare, MessageSquarePlus, Search } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { InboxListSkeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-state";
import { CONVERSATIONS, EYEBROW, NAV, type InboxListFilter } from "@/lib/brand-copy";
import { STAGE_BADGE } from "@/lib/crm";
import { formatStage } from "@/lib/stage-labels";
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

const LIST_FILTERS: { id: InboxListFilter; label: string }[] = [
  { id: "all", label: CONVERSATIONS.filterAll },
  { id: "handoff", label: CONVERSATIONS.yourTurn },
  { id: "unread", label: CONVERSATIONS.filterUnread },
  { id: "unassigned", label: CONVERSATIONS.filterUnassigned },
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

function isClosedStage(stage: string) {
  return stage === "WON" || stage === "LOST";
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
  onListFilterChange,
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
  onListFilterChange?: (f: InboxListFilter) => void;
  yourTurnCount?: number;
}) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border/80 bg-[#f8f9ff] md:w-[min(100%,320px)] lg:w-[360px]">
      <div className="shrink-0 border-b border-border/80 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {EYEBROW.messaging}
            </p>
            <h1 className="text-base font-bold tracking-tight">{NAV.conversations}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {onNewMessage && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[10px]"
                onClick={onNewMessage}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                New
              </Button>
            )}
            {hasWhatsapp && (
              <span className="rounded-full bg-bento-mint px-2 py-0.5 text-[9px] font-bold uppercase text-accent">
                Live
              </span>
            )}
            {live && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" title="Realtime sync" />
            )}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
        </p>
        {(conversations.length > 0 || search) && (
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name or message…"
              className="h-8 rounded-lg border-border/80 bg-[#f8f9ff] pl-9 text-xs"
            />
          </div>
        )}
        {onListFilterChange && (
          <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
            {LIST_FILTERS.map(({ id, label }) => {
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
                  {label}
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
              title="WhatsApp not connected"
              description="Connect your business number to see customer messages here."
              actionHref="/dashboard/settings?tab=whatsapp"
              actionLabel="Connect WhatsApp"
            />
          </div>
        )}

        {!listLoading && !listError && hasWhatsapp && conversations.length === 0 && (
          <div className="p-3">
            <EmptyState
              compact
              icon={<Inbox className="h-6 w-6" />}
              title={
                listFilter === "handoff"
                  ? "You're all caught up"
                  : listFilter === "unread"
                    ? "No unread messages"
                    : listFilter === "unassigned"
                      ? "Everyone has an owner"
                      : "No messages yet"
              }
              description={
                listFilter === "all"
                  ? "Message your business number from your phone to start."
                  : "Try another filter or check back when new messages arrive."
              }
              actionHref={listFilter === "all" ? "/dashboard/settings?tab=whatsapp" : undefined}
              actionLabel={listFilter === "all" ? "WhatsApp settings" : undefined}
            />
          </div>
        )}

        <ul className="divide-y divide-border/50">
          {conversations.map((c) => {
            const displayName = c.contactName ?? c.contactPhone;
            const active = selectedId === c.id;
            const closed = c.lead ? isClosedStage(c.lead.stage) : false;
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
                    closed && !active && "opacity-75",
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
                      {c.messages[0]?.content ?? "No messages"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {c.requiresHuman && (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                          {CONVERSATIONS.waitingOnYou}
                        </span>
                      )}
                      {c.lead && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            STAGE_BADGE[c.lead.stage as keyof typeof STAGE_BADGE] ??
                              "bg-primary-soft text-muted-foreground",
                            closed && "opacity-80",
                          )}
                        >
                          {formatStage(c.lead.stage)}
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
    </aside>
  );
}
