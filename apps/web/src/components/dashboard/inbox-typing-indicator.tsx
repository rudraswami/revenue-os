"use client";

import { cn } from "@/lib/utils";

export function InboxTypingIndicator({
  userName,
  className,
}: {
  userName?: string | null;
  className?: string;
}) {
  if (!userName) return null;
  return (
    <p
      className={cn(
        "mb-2 flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex gap-0.5" aria-hidden>
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:240ms]" />
      </span>
      <span>{userName} is typing…</span>
    </p>
  );
}
