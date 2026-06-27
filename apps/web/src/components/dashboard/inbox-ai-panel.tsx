"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, Target, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export function InboxAiPanel({
  aiContext,
  requiresHuman,
  handoffReason,
  canEdit,
  onTakeover,
  onCreateTask,
  onAssignToMe,
  onResolveHandoff,
  takeoverPending,
  taskPending,
  assignPending,
  resolvePending,
}: {
  aiContext: InboxAiContext | null;
  requiresHuman?: boolean;
  handoffReason?: string | null;
  canEdit: boolean;
  onTakeover: (taskTitle?: string) => void;
  onCreateTask: (title?: string) => void;
  onAssignToMe: () => void;
  onResolveHandoff: () => void;
  takeoverPending?: boolean;
  taskPending?: boolean;
  assignPending?: boolean;
  resolvePending?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!aiContext && !requiresHuman) return null;

  const confidencePct =
    aiContext?.confidence != null ? Math.round(aiContext.confidence * 100) : null;

  const suggestedTitle =
    aiContext?.nextAction || aiContext?.suggestedActions[0] || undefined;

  return (
    <div className="border-t border-border/50 bg-[#f8f9ff]/80 px-4 py-2.5 lg:px-5">
      {requiresHuman && (
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs font-semibold text-amber-900">
              Handoff — {handoffReason || "needs a human on your team"}
            </p>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg bg-accent text-[11px] hover:bg-accent-hover"
                  disabled={takeoverPending}
                  onClick={() => onTakeover(suggestedTitle)}
                >
                  <UserRound className="h-3.5 w-3.5" />
                  Take over
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[10px] text-amber-900"
                  disabled={resolvePending}
                  onClick={onResolveHandoff}
                >
                  Mark resolved only
                </Button>
              </div>
            )}
          </div>
          {canEdit && (
            <p className="mt-1.5 text-[10px] text-amber-800/80">
              Take over assigns you, creates a high-priority task, and clears the handoff flag.
            </p>
          )}
        </div>
      )}

      {aiContext && (
        <div className="rounded-xl border border-[#dce9ff] bg-white p-3">
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
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize",
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
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {confidencePct}% confident
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
                      className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {canEdit && !requiresHuman && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[10px]"
                disabled={taskPending}
                onClick={() => onCreateTask(suggestedTitle)}
              >
                Create task
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-[10px]"
                disabled={assignPending}
                onClick={onAssignToMe}
              >
                <UserRound className="h-3 w-3" />
                Assign to me
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
