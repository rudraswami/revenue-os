"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles, Target, UserRound } from "lucide-react";
import type { LeadStage } from "@growvisi/shared";
import { Button } from "@/components/ui/button";
import { LEAD_STAGES } from "@/lib/crm";
import { trackAiTrust } from "@/lib/ai-trust-analytics";
import { trackCoaching } from "@/lib/coaching-analytics";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { AssignmentExplainLine } from "@/components/dashboard/assignment-explain-line";
import type { AssignmentExplain } from "@/lib/assignment-explain";
import { cn } from "@/lib/utils";

export interface InboxAiContext {
  intent: string;
  sentiment: string;
  confidence: number | null;
  summary: string;
  nextAction: string;
  suggestedActions: string[];
  tags: string[];
  classifiedAt: string;
  humanCorrected?: boolean;
  humanCorrectedAt?: string | null;
}

export type AiCorrectionPayload = {
  stage?: LeadStage;
  score?: number;
  requiresHuman?: boolean;
  intent?: string;
  note?: string;
};

export function InboxAiPanel({
  aiContext,
  requiresHuman,
  handoffReason,
  assignment,
  showAssignmentRulesLink,
  leadStage,
  leadScore,
  canEdit,
  onTakeover,
  onCreateTask,
  onAssignToMe,
  onResolveHandoff,
  onCorrectAi,
  correctionPending,
  knowledgeGaps = [],
  coachTakeover,
  takeoverPending,
  taskPending,
  assignPending,
  resolvePending,
}: {
  aiContext: InboxAiContext | null;
  requiresHuman?: boolean;
  handoffReason?: string | null;
  assignment?: AssignmentExplain | null;
  showAssignmentRulesLink?: boolean;
  leadStage?: string | null;
  leadScore?: number | null;
  canEdit: boolean;
  onTakeover: (taskTitle?: string) => void;
  onCreateTask: (title?: string) => void;
  onAssignToMe: () => void;
  onResolveHandoff: () => void;
  onCorrectAi?: (payload: AiCorrectionPayload) => void;
  correctionPending?: boolean;
  knowledgeGaps?: string[];
  /** Post-activation coaching: emphasize Reply now until first takeover */
  coachTakeover?: boolean;
  takeoverPending?: boolean;
  taskPending?: boolean;
  assignPending?: boolean;
  resolvePending?: boolean;
}) {
  const copy = useConversationsCopy();
  const [expanded, setExpanded] = useState(!!requiresHuman || !!coachTakeover);
  const [fixOpen, setFixOpen] = useState(false);
  const [stage, setStage] = useState<LeadStage>((leadStage as LeadStage) || "NEW");
  const [score, setScore] = useState(String(leadScore ?? 50));
  const [flagHuman, setFlagHuman] = useState(!!requiresHuman);
  const [intent, setIntent] = useState(aiContext?.intent ?? "");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (requiresHuman) setExpanded(true);
  }, [requiresHuman, aiContext?.classifiedAt]);

  useEffect(() => {
    if (requiresHuman && coachTakeover && canEdit) {
      trackCoaching("coaching_takeover_prompt_view");
    }
  }, [requiresHuman, coachTakeover, canEdit]);

  useEffect(() => {
    setStage((leadStage as LeadStage) || "NEW");
    setScore(String(leadScore ?? 50));
    setFlagHuman(!!requiresHuman);
    setIntent(aiContext?.intent ?? "");
    setNote("");
    setFixOpen(false);
  }, [aiContext?.classifiedAt, leadStage, leadScore, requiresHuman, aiContext?.intent]);

  if (!aiContext && !requiresHuman) return null;

  const confidencePct =
    aiContext?.confidence != null ? Math.round(aiContext.confidence * 100) : null;

  const suggestedTitle =
    aiContext?.nextAction || aiContext?.suggestedActions[0] || undefined;

  function submitCorrection() {
    const parsedScore = Number.parseInt(score, 10);
    const payload: AiCorrectionPayload = {
      stage,
      score: Number.isFinite(parsedScore) ? Math.min(100, Math.max(0, parsedScore)) : undefined,
      requiresHuman: flagHuman,
      intent: intent.trim() || undefined,
      note: note.trim() || undefined,
    };
    trackAiTrust("ai_correction_submit", {
      stage: payload.stage,
      score: payload.score,
      requiresHuman: payload.requiresHuman,
    });
    onCorrectAi?.(payload);
  }

  return (
    <div className="border-t border-border/50 bg-background/80 px-4 py-2.5 lg:px-5">
      {knowledgeGaps.length > 0 && (
        <div className="mb-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <p className="font-semibold">Add Business Knowledge</p>
          <p className="mt-0.5 leading-relaxed text-amber-900/90">
            Customers asked about {knowledgeGaps.join(", ")} but no matching docs were found. Add
            pricing or policies in Settings → Intelligence.
          </p>
        </div>
      )}

      {requiresHuman && (
        <div className="mb-2 rounded-xl border border-amber-200/90 bg-card elev-1 px-3 py-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs font-semibold leading-snug text-amber-950">
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
            <p className="mt-1.5 text-xs leading-relaxed text-amber-800/85">
              {coachTakeover ? copy.coachTakeoverHint : copy.replyNowHint}
            </p>
          )}
        </div>
      )}

      {assignment && (
        <AssignmentExplainLine
          assignment={assignment}
          showRulesLink={showAssignmentRulesLink}
          className="mb-2"
        />
      )}

      {aiContext && (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <button
            type="button"
            className="flex w-full items-start justify-between gap-2 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="text-xs font-bold text-foreground">
                  {aiContext.intent || "Classified"}
                </span>
                {aiContext.sentiment && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-semibold capitalize",
                      aiContext.sentiment === "positive"
                        ? "bg-bento-mint text-accent"
                        : aiContext.sentiment === "negative"
                          ? "bg-red-50 text-red-600"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {aiContext.sentiment}
                  </span>
                )}
                {confidencePct != null && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {confidencePct}%
                  </span>
                )}
                {aiContext.humanCorrected && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-bento-mint px-1.5 py-0.5 text-xs font-semibold text-accent">
                    <Check className="h-2.5 w-2.5" />
                    {copy.aiCorrected}
                  </span>
                )}
              </div>
              {aiContext.summary && !expanded && (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{aiContext.summary}</p>
              )}
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
              {aiContext.summary && (
                <p className="text-xs leading-relaxed text-muted-foreground">{aiContext.summary}</p>
              )}
              {aiContext.nextAction && (
                <div className="flex items-start gap-2 rounded-lg bg-bento-mint/40 p-2">
                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <p className="text-xs font-medium text-accent">{aiContext.nextAction}</p>
                </div>
              )}
              {aiContext.suggestedActions.length > 0 && (
                <ul className="list-inside list-disc text-xs text-muted-foreground">
                  {aiContext.suggestedActions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              {aiContext.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {aiContext.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {canEdit && (
            <div className="mt-2 flex flex-wrap gap-2">
              {!requiresHuman && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={taskPending}
                    onClick={() => onCreateTask(suggestedTitle)}
                  >
                    Create task
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    disabled={assignPending}
                    onClick={onAssignToMe}
                  >
                    <UserRound className="h-3 w-3" />
                    Assign to me
                  </Button>
                </>
              )}
              {onCorrectAi && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    const next = !fixOpen;
                    setFixOpen(next);
                    if (next) trackAiTrust("ai_correction_open");
                  }}
                >
                  {fixOpen ? copy.aiFixCancel : copy.aiFixClassification}
                </Button>
              )}
            </div>
          )}

          {canEdit && fixOpen && onCorrectAi && (
            <div className="mt-2 space-y-2 rounded-lg border border-border/80 bg-background p-2.5">
              <p className="text-xs font-semibold text-foreground">{copy.aiFixTitle}</p>
              <p className="text-xs text-muted-foreground">{copy.aiFixHint}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  {copy.aiFixStage}
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as LeadStage)}
                    className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
                  >
                    {LEAD_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {copy.stageLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  {copy.aiFixScore}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                {copy.aiFixIntent}
                <input
                  type="text"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  maxLength={120}
                  className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={flagHuman}
                  onChange={(e) => setFlagHuman(e.target.checked)}
                  className="rounded border-border"
                />
                {copy.aiFixNeedsYou}
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                {copy.aiFixNote}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder={copy.aiFixNotePlaceholder}
                  className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
                />
              </label>
              <Button
                type="button"
                size="sm"
                className="h-8 w-full rounded-lg text-xs"
                disabled={correctionPending}
                onClick={submitCorrection}
              >
                {correctionPending ? copy.aiFixSaving : copy.aiFixSave}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
