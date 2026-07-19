"use client";

import { useEffect } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackCoaching } from "@/lib/coaching-analytics";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";

export interface InboxAiContext {
  intent: string;
  sentiment: string;
  confidence: number | null;
  summary: string;
  nextAction: string;
  suggestedActions: string[];
  tags: string[];
  customerNeeds?: string[];
  classifiedAt: string;
  humanCorrected?: boolean;
  humanCorrectedAt?: string | null;
}

export type AiCorrectionPayload = {
  stage?: import("@growvisi/shared").LeadStage;
  score?: number;
  requiresHuman?: boolean;
  intent?: string;
  note?: string;
};

/** Handoff alerts and knowledge gaps only — classification lives in Activity sidebar. */
export function InboxAiPanel({
  aiContext,
  requiresHuman,
  handoffReason,
  canEdit,
  onTakeover,
  onResolveHandoff,
  knowledgeGaps = [],
  kbHealth,
  coachTakeover,
  takeoverPending,
  resolvePending,
}: {
  aiContext: InboxAiContext | null;
  requiresHuman?: boolean;
  handoffReason?: string | null;
  canEdit: boolean;
  onTakeover: (taskTitle?: string) => void;
  onResolveHandoff: () => void;
  knowledgeGaps?: string[];
  kbHealth?: { chunkCount: number; readyForResponsivePreset: boolean } | null;
  coachTakeover?: boolean;
  takeoverPending?: boolean;
  resolvePending?: boolean;
}) {
  const copy = useConversationsCopy();

  useEffect(() => {
    if (requiresHuman && coachTakeover && canEdit) {
      trackCoaching("coaching_takeover_prompt_view");
    }
  }, [requiresHuman, coachTakeover, canEdit]);

  if (
    !requiresHuman &&
    knowledgeGaps.length === 0 &&
    !(aiContext?.customerNeeds?.length ?? 0) &&
    !(kbHealth && kbHealth.chunkCount === 0)
  ) {
    return null;
  }

  const suggestedTitle =
    aiContext?.nextAction || aiContext?.suggestedActions[0] || undefined;

  return (
    <div className="border-t border-border/50 bg-background/80 px-4 py-2 lg:px-5">
      {kbHealth && kbHealth.chunkCount === 0 && (
        <div className="mb-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
          <p className="leading-relaxed text-amber-900/90">
            Business Knowledge is empty — Growvisi can greet customers but cannot auto-answer
            questions yet. Add docs in Intelligence.
          </p>
        </div>
      )}
      {knowledgeGaps.length > 0 && (
        <div className="mb-2 rounded-lg border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
          <p className="leading-relaxed text-amber-900/90">
            No docs matched for {knowledgeGaps.join(", ")}. Add them in Intelligence for
            grounded replies.
          </p>
        </div>
      )}

      {(aiContext?.customerNeeds?.length ?? 0) > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {aiContext!.customerNeeds!.map((need) => (
            <span
              key={need}
              className="rounded-full border border-accent/25 bg-bento-mint/50 px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              {need}
            </span>
          ))}
        </div>
      )}

      {requiresHuman && (
        <div className="rounded-lg border border-amber-200/90 bg-amber-50/50 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-950">
              {copy.needsYouTitle(handoffReason)}
            </p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg bg-accent text-xs hover:bg-accent-hover"
                  disabled={takeoverPending}
                  onClick={() => onTakeover(suggestedTitle)}
                >
                  <UserRound className="h-3.5 w-3.5" />
                  {copy.replyNow}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-amber-900 hover:bg-amber-100/60"
                  disabled={resolvePending}
                  onClick={onResolveHandoff}
                >
                  {copy.alreadyHandled}
                </Button>
              </div>
            )}
          </div>
          {canEdit && (
            <p className="mt-1 text-xs leading-relaxed text-amber-800/85">
              {coachTakeover ? copy.coachTakeoverHint : copy.replyNowHint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
