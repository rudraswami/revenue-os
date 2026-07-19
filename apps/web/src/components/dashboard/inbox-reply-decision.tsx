"use client";

import type { ReplyDecision } from "@growvisi/shared";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

export function InboxReplyDecision({
  decision,
  hasDraft,
  className,
}: {
  decision: ReplyDecision | null | undefined;
  hasDraft?: boolean;
  className?: string;
}) {
  const copy = useConversationsCopy();
  if (!decision) return null;

  if (decision.mode === "send") {
    return (
      <div
        className={cn(
          "rounded-xl border border-accent/30 bg-bento-mint/60 px-3 py-2 text-xs text-foreground",
          className,
        )}
      >
        <p className="font-semibold text-accent">{copy.replyAutoSentTitle}</p>
      </div>
    );
  }

  if (decision.mode === "skip" && !hasDraft) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <p className="font-semibold text-foreground">{copy.replySkippedTitle}</p>
      </div>
    );
  }

  return null;
}
