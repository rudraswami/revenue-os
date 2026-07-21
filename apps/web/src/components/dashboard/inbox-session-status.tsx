"use client";

import { useEffect, useState } from "react";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import {
  formatSessionTimeLeft,
  isMessagingWindowOpen,
  messagingWindowRemainingMs,
} from "@/lib/inbox-session-status";
import { cn } from "@/lib/utils";

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

  const open = isMessagingWindowOpen(lastInboundAt);
  if (!lastInboundAt) return null;

  return (
    <p
      className={cn(
        "mb-2 flex items-center gap-2 text-xs",
        open ? "text-success" : "text-warning",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          open ? "bg-success" : "bg-warning",
        )}
        aria-hidden
      />
      {open ? (
        <>
          <span className="font-medium">{copy.sessionOpen}</span>
          <span className="text-muted-foreground">
            · {formatSessionTimeLeft(remainingMs, copy.locale)}
          </span>
        </>
      ) : (
        <span className="font-medium">{copy.sessionClosed}</span>
      )}
    </p>
  );
}
