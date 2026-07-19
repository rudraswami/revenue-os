"use client";

import { Sparkles } from "lucide-react";
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
        <ul className="mt-1 space-y-0.5 leading-relaxed opacity-90">
          {decision.reasons.slice(0, 4).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
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
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          {decision.reasons.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (decision.mode !== "draft" && !hasDraft) return null;

  const draftMissingAfterPlan = decision.mode === "draft" && !hasDraft;

  // Draft is in the composer — still surface why auto-send was held back.
  if (decision.mode === "draft" && hasDraft) {
    const holdReasons =
      decision.reasons.length > 0
        ? decision.reasons
        : decision.blockers?.length
          ? [copy.replyDraftBlockedFallback]
          : [copy.aiDraftNote];
    return (
      <div
        className={cn(
          "rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-950",
          className,
        )}
      >
        <p className="font-semibold">{copy.replyDraftHeldTitle}</p>
        <ul className="mt-1 space-y-0.5 leading-relaxed opacity-90">
          {holdReasons.slice(0, 4).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    );
  }

  const riskTone =
    decision.risk === "high"
      ? "border-amber-200/80 bg-amber-50/80 text-amber-950"
      : decision.risk === "medium"
        ? "border-border/70 bg-card text-foreground"
        : "border-accent/25 bg-bento-mint/50 text-foreground";

  return (
    <div className={cn("rounded-xl border px-3 py-2 text-xs", riskTone, className)}>
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {draftMissingAfterPlan ? copy.replyDraftFailed : copy.replyDraftPlanned}
            {decision.confidence > 0 ? (
              <span className="ml-1.5 font-normal opacity-75">
                · {Math.round(decision.confidence * 100)}% confidence
              </span>
            ) : null}
          </p>
          <ul className="mt-1 space-y-0.5 leading-relaxed opacity-90">
            {decision.reasons.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
