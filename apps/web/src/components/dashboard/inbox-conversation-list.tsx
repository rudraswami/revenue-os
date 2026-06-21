"use client";

import { Inbox, MessageSquare, Search } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { InboxListSkeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-state";
import { EYEBROW, NAV } from "@/lib/brand-copy";
import { formatStage } from "@/lib/stage-labels";
import { cn } from "@/lib/utils";

export interface InboxConversationRow {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastMessageAt: string | null;
  lead: { id: string; stage: string } | null;
  messages: Array<{ content: string | null }>;
}

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
}) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border/80 bg-[#f8f9ff] md:w-[min(100%,300px)] lg:w-[320px]">
      <div className="shrink-0 border-b border-border/80 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {EYEBROW.messaging}
            </p>
            <h1 className="text-base font-bold tracking-tight">{NAV.conversations}</h1>
          </div>
          <div className="flex items-center gap-1.5">
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
              actionHref="/dashboard/settings#whatsapp"
              actionLabel="Connect WhatsApp"
            />
          </div>
        )}

        {!listLoading && !listError && hasWhatsapp && conversations.length === 0 && (
          <div className="p-3">
            <EmptyState
              compact
              icon={<Inbox className="h-6 w-6" />}
              title="No messages yet"
              description="Message your business number from your phone to start."
              actionHref="/dashboard/settings#whatsapp"
              actionLabel="WhatsApp settings"
            />
          </div>
        )}

        <ul className="divide-y divide-border/50">
          {conversations.map((c) => {
            const displayName = c.contactName ?? c.contactPhone;
            const active = selectedId === c.id;
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
                      {c.lead && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            active ? "bg-accent/10 text-accent" : "bg-primary-soft text-muted-foreground",
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
