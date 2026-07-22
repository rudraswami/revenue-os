"use client";

import { memo } from "react";
import { InboxMessageActions } from "@/components/dashboard/inbox-message-actions";
import { InboxMessageBody } from "@/components/dashboard/inbox-message-body";
import { InboxMessageStatus } from "@/components/dashboard/inbox-message-status";
import { getCopyableMessageText } from "@/lib/inbox-message-helpers";
import { cn } from "@/lib/utils";

export interface ThreadMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content: string | null;
  createdAt: string;
  status: string;
  sentByAi?: boolean;
  errorMessage?: string | null;
  waMessageId?: string | null;
  payload?: { context?: { id?: string } | null } | null;
}

export interface InboxThreadMessageRowProps {
  message: ThreadMessage;
  conversationId: string;
  contactLabel: string;
  showUnreadDivider?: boolean;
  unreadDividerLabel: string;
  quoted: ThreadMessage | null;
  highlighted: boolean;
  searchActive: boolean;
  searchMatched: boolean;
  canQuote: boolean;
  canPin: boolean;
  canFollowUp: boolean;
  canRetry: boolean;
  messageFailedLabel: string;
  messageRetryLabel: string;
  replyingToYouLabel: string;
  replyingToAttachmentLabel: string;
  onQuote?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  onFollowUp?: () => void;
  onRetry?: () => void;
  onJumpToQuoted?: () => void;
  onImageOpen: (messageId: string) => void;
}

export const InboxThreadMessageRow = memo(function InboxThreadMessageRow({
  message: m,
  conversationId,
  contactLabel,
  showUnreadDivider,
  unreadDividerLabel,
  quoted,
  highlighted,
  searchActive,
  searchMatched,
  canQuote,
  canPin,
  canFollowUp,
  canRetry,
  messageFailedLabel,
  messageRetryLabel,
  replyingToYouLabel,
  replyingToAttachmentLabel,
  onQuote,
  onCopy,
  onPin,
  onFollowUp,
  onRetry,
  onJumpToQuoted,
  onImageOpen,
}: InboxThreadMessageRowProps) {
  const copyableText = getCopyableMessageText(m.content);

  return (
    <div className="pb-2.5">
      {showUnreadDivider && (
        <div
          className="flex items-center gap-3 py-1.5"
          aria-label={unreadDividerLabel}
        >
          <div className="h-px flex-1 bg-accent/25" />
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
            {unreadDividerLabel}
          </span>
          <div className="h-px flex-1 bg-accent/25" />
        </div>
      )}
      <div
        className={cn(
          "group relative max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm transition-shadow",
          m.direction === "OUTBOUND"
            ? "ml-auto rounded-br-md border border-success/30 bg-whatsapp-green text-foreground"
            : "mr-auto rounded-bl-md border border-border/70 bg-card text-foreground",
          highlighted && "ring-2 ring-accent ring-offset-1",
          searchMatched && !highlighted && searchActive && "ring-1 ring-warning/50",
        )}
      >
        <InboxMessageActions
          canQuote={canQuote}
          canCopy={!!copyableText}
          canPin={canPin}
          onQuote={onQuote}
          onCopy={onCopy}
          onPin={onPin}
          canFollowUp={canFollowUp}
          onFollowUp={onFollowUp}
        />
        {quoted && onJumpToQuoted && (
          <button
            type="button"
            onClick={onJumpToQuoted}
            className={cn(
              "mb-1.5 flex w-full items-stretch gap-2 rounded-lg border-l-2 py-1 pl-2 pr-2 text-left transition hover:brightness-95",
              m.direction === "OUTBOUND"
                ? "border-success/60 bg-success/10"
                : "border-accent/50 bg-accent/5",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-accent">
                {quoted.direction === "OUTBOUND" ? replyingToYouLabel : contactLabel}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {getCopyableMessageText(quoted.content) ??
                  quoted.content ??
                  replyingToAttachmentLabel}
              </span>
            </span>
          </button>
        )}
        <InboxMessageBody
          conversationId={conversationId}
          messageId={m.id}
          type={m.type ?? "TEXT"}
          content={m.content}
          onImageOpen={onImageOpen}
        />
        <p
          className={cn(
            "mt-1 flex items-center gap-1.5 text-xs",
            m.direction === "OUTBOUND" ? "text-success" : "text-muted-foreground",
          )}
        >
          {m.sentByAi && m.direction === "OUTBOUND" && (
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
              AI
            </span>
          )}
          <span>
            {new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            })}
          </span>
          {m.direction === "OUTBOUND" && <InboxMessageStatus status={m.status} />}
        </p>
        {m.direction === "OUTBOUND" && (m.status ?? "").toUpperCase() === "FAILED" && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-destructive">
            <span className="font-medium">{m.errorMessage?.trim() || messageFailedLabel}</span>
            {canRetry && onRetry && (
              <button
                type="button"
                className="font-semibold underline underline-offset-2 hover:no-underline"
                onClick={onRetry}
              >
                {messageRetryLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

/** Rough height hint for @tanstack/react-virtual before measureElement runs. */
export function estimateThreadMessageSize(
  message: ThreadMessage,
  opts: { hasQuoted: boolean; hasUnreadDivider: boolean },
): number {
  let height = 56;
  const type = (message.type ?? "TEXT").toUpperCase();
  if (type === "IMAGE" || type === "STICKER") height = 300;
  else if (type === "VIDEO" || type === "AUDIO") height = 128;
  else if (type === "DOCUMENT") height = 96;
  else if (message.content && message.content.length > 100) {
    height = 64 + Math.min(96, Math.floor(message.content.length / 48) * 20);
  }
  if (opts.hasQuoted) height += 56;
  if (opts.hasUnreadDivider) height += 40;
  if ((message.status ?? "").toUpperCase() === "FAILED") height += 28;
  return height;
}
