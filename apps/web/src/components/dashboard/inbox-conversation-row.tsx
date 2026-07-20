"use client";

import { memo } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";
import type { InboxConversationRow } from "@/components/dashboard/inbox-conversation-list";

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

export const InboxConversationRowItem = memo(function InboxConversationRowItem({
  conversation: c,
  active,
  closed,
  onSelect,
  onHover,
}: {
  conversation: InboxConversationRow;
  active: boolean;
  closed: boolean;
  onSelect: (id: string) => void;
  onHover?: (id: string) => void;
}) {
  const copy = useConversationsCopy();
  const displayName = c.contactName ?? c.contactPhone;
  const yourTurn = c.requiresHuman && !closed;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(c.id)}
        onMouseEnter={() => onHover?.(c.id)}
        onFocus={() => onHover?.(c.id)}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
          active
            ? "border-l-[3px] border-l-accent bg-card"
            : "border-l-[3px] border-l-transparent hover:bg-card/70",
          closed && !active && "opacity-80",
        )}
      >
        <div className="relative shrink-0">
          <AvatarInitials name={displayName} size="sm" />
          {yourTurn && (
            <span
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background"
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={cn(
                "truncate text-sm",
                c.unreadCount > 0 ? "font-bold text-foreground" : "font-semibold",
                active && "text-accent",
              )}
            >
              {displayName}
            </p>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatListTime(c.lastMessageAt)}
            </span>
          </div>
          <p
            className={cn(
              "mt-0.5 line-clamp-2 text-xs leading-snug",
              c.unreadCount > 0 ? "font-medium text-foreground/80" : "text-muted-foreground",
            )}
          >
            {c.messages[0]?.content ?? "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {yourTurn && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                {copy.yourTurn}
              </span>
            )}
            {c.postCloseAttention && !closed && (
              <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-900">
                Post-close
              </span>
            )}
            {c.lead && (
              <span className="text-[10px] font-medium text-muted-foreground">
                {copy.stageLabel(c.lead.stage)}
              </span>
            )}
            {c.unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                {c.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
});
