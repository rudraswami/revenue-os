"use client";

import type { ReplyDecision } from "@growvisi/shared";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

/**
 * Concise, user-facing explanation for why a turn became a draft instead of an
 * auto-send. Keyed by the blocker codes emitted in reply-policy.service.ts /
 * automation-policy.service.ts. Falls back to the server-provided reason text.
 */
const DRAFT_BLOCKER_LABELS: Record<string, string> = {
  auto_send_plan: "Auto-send needs the Growth plan.",
  kb_not_indexed: "No Business Knowledge indexed yet — add docs in Settings → AI & replies.",
  knowledge_gap: "No matching doc for this question.",
  no_knowledge: "No matching Business Knowledge — add pricing or FAQ docs.",
  not_grounded: "No Business Knowledge match for this.",
  weak_grounding: "Knowledge match too weak to send automatically.",
  low_answerability: "Not confident the docs fully answer this.",
  low_confidence: "AI isn't confident enough to send on its own.",
  pricing_review: "Pricing reply — needs your review.",
  deal_stage: "Deal stage — review before sending a commercial reply.",
  discount_authority: "Customer asked for a discount — set discount policy in Automations → Advanced.",
  sensitive_intent: "Sensitive topic — review the AI draft before sending.",
  compose_grounding: "Reply includes a price not found in your knowledge — review before sending.",
  high_stakes: "High-stakes message — drafted for your review.",
  post_sale_commercial: "Deal is closed — review before sending.",
  win_back_commercial: "Win-back — review before sending.",
  velocity_guard: "Auto-send paused briefly (too many auto-replies).",
  loop_guard: "Auto-send paused to avoid a reply loop.",
};

function primaryDraftReason(decision: ReplyDecision): string | null {
  const code = decision.blockers?.find((c) => DRAFT_BLOCKER_LABELS[c]);
  if (code) return DRAFT_BLOCKER_LABELS[code];
  // Fall back to the first server reason that reads like a blocker (has a dash/period).
  return decision.reasons?.[decision.reasons.length - 1] ?? decision.reasons?.[0] ?? null;
}

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

  if (decision.mode === "draft" && hasDraft) {
    const reason = primaryDraftReason(decision);
    if (!reason) return null;
    return (
      <div
        className={cn(
          "rounded-xl border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-foreground",
          className,
        )}
      >
        <p className="font-semibold text-warning">Drafted for your review</p>
        <p className="mt-0.5 text-muted-foreground">{reason}</p>
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
