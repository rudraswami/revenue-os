"use client";

import { memo } from "react";
import { HOT_LEAD_SCORE_THRESHOLD } from "@growvisi/shared";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";
import type { InboxConversationRow } from "@/components/dashboard/inbox-conversation-list";

/** Fixed row height — must match virtualizer estimateSize in inbox-conversation-list. */
export const INBOX_LIST_ROW_HEIGHT = 72;

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

function previewText(content: string | null | undefined): string {
  const text = content?.replace(/\s+/g, " ").trim();
  return text && text.length > 0 ? text : "—";
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
  const isHot = (c.lead?.score ?? 0) >= HOT_LEAD_SCORE_THRESHOLD;
  const hasUnread = c.unreadCount > 0;

  return (
    <button
      type="button"
      data-testid="inbox-conversation-row"
      onClick={() => onSelect(c.id)}
      onMouseEnter={() => onHover?.(c.id)}
      onFocus={() => onHover?.(c.id)}
      className={cn(
        "flex h-[72px] w-full items-center gap-3 border-b border-border/50 px-3 text-left transition-colors",
        active
          ? "border-l-[3px] border-l-accent bg-card pl-[calc(0.75rem-3px)]"
          : "border-l-[3px] border-l-transparent hover:bg-muted/30",
        yourTurn && !active && "bg-amber-50/30",
        closed && !active && "opacity-85",
      )}
    >
      <div className="relative shrink-0">
        <AvatarInitials
          name={displayName}
          seed={c.contactPhone}
          size="md"
          className={cn(
            "shadow-sm ring-1 ring-border/60",
            isHot && !yourTurn && "ring-accent/35",
          )}
        />
        {yourTurn && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background"
            title={copy.yourTurn}
            aria-label={copy.yourTurn}
          />
        )}
        {isHot && !yourTurn && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-background"
            title={copy.scoreHot(c.lead?.score ?? 0)}
            aria-hidden
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm leading-tight",
              hasUnread || yourTurn ? "font-semibold text-foreground" : "font-medium text-foreground",
              active && "text-accent",
            )}
          >
            {displayName}
          </p>
          <span
            className={cn(
              "shrink-0 text-xs tabular-nums",
              hasUnread ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {formatListTime(c.lastMessageAt)}
          </span>
        </div>

        <p
          className={cn(
            "mt-1 line-clamp-1 text-xs leading-snug",
            hasUnread || yourTurn ? "text-foreground/75" : "text-muted-foreground",
          )}
        >
          {previewText(c.messages[0]?.content)}
        </p>
      </div>

      {hasUnread && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold leading-none text-white">
          {c.unreadCount > 99 ? "99+" : c.unreadCount}
        </span>
      )}
    </button>
  );
});
