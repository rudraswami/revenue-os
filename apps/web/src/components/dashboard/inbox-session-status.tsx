"use client";

import { useEffect, useState } from "react";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import {
  formatSessionTimeLeft,
  isMessagingWindowOpen,
  messagingWindowRemainingMs,
} from "@/lib/inbox-session-status";
import { cn } from "@/lib/utils";

/**
 * Contextual "closing soon" nudge. To keep the composer area clean, the
 * session line is hidden while the 24h window has plenty of time left and
 * when it is fully closed (the closed state is surfaced by the dedicated
 * window-closed banner in the thread pane). It only appears in the final
 * stretch so agents get a timely reminder.
 */
const SESSION_WARN_MS = 2 * 60 * 60 * 1000;

export function InboxSessionStatus({
  lastInboundAt,
  className,
}: {
  lastInboundAt?: string | null;
  className?: string;
}) {
  const copy = useConversationsCopy();
  const [remainingMs, setRemainingMs] = useState(() =>
    messagingWindowRemainingMs(lastInboundAt),
  );

  useEffect(() => {
    setRemainingMs(messagingWindowRemainingMs(lastInboundAt));
    const id = window.setInterval(() => {
      setRemainingMs(messagingWindowRemainingMs(lastInboundAt));
    }, 60_000);
    return () => window.clearInterval(id);
  }, [lastInboundAt]);

  if (!lastInboundAt) return null;
  const open = isMessagingWindowOpen(lastInboundAt);
  if (!open || remainingMs > SESSION_WARN_MS) return null;

  return (
    <p
      className={cn(
        "mb-2 flex items-center gap-2 text-xs text-warning",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
      <span className="font-medium">{copy.sessionClosingSoon}</span>
      <span className="text-warning/80">
        · {formatSessionTimeLeft(remainingMs, copy.locale)}
      </span>
    </p>
  );
}
