"use client";

import { Plus, Trash2 } from "lucide-react";
import { MAX_QUICK_ANSWERS, type QuickAnswer } from "@growvisi/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function makeId(): string {
  return `qa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Editor for structured Quick Answers — curated FAQ/price pairs Growvisi can
 * auto-answer with zero uploaded documents. Strong matches auto-send (when
 * WhatsApp auto-reply is on); weak matches still produce a grounded draft.
 */
export function QuickAnswersEditor({
  value,
  onChange,
  disabled,
}: {
  value: QuickAnswer[];
  onChange: (next: QuickAnswer[]) => void;
  disabled?: boolean;
}) {
  const atLimit = value.length >= MAX_QUICK_ANSWERS;

  function update(id: string, patch: Partial<QuickAnswer>) {
    onChange(value.map((qa) => (qa.id === id ? { ...qa, ...patch } : qa)));
  }

  function remove(id: string) {
    onChange(value.filter((qa) => qa.id !== id));
  }

  function add() {
    if (atLimit) return;
    onChange([...value, { id: makeId(), question: "", answer: "" }]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Quick answers</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Add your common questions and exact replies. Growvisi auto-answers
            strong matches and drafts the rest — no document upload needed.
          </p>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {value.length}/{MAX_QUICK_ANSWERS}
        </span>
      </div>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No quick answers yet. Add your first FAQ or price so Growvisi can
            answer it instantly.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {value.map((qa, index) => (
            <li
              key={qa.id}
              className="rounded-xl border border-border/70 bg-card/60 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Q{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(qa.id)}
                  disabled={disabled}
                  aria-label="Delete quick answer"
                  className="rounded-md p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                value={qa.question}
                disabled={disabled}
                placeholder="Customer question (e.g. What's the price for a 2BHK interior?)"
                onChange={(e) => update(qa.id, { question: e.target.value })}
                className="mb-2 h-10"
              />
              <Textarea
                value={qa.answer}
                disabled={disabled}
                placeholder="Your exact reply (e.g. 2BHK interiors start at ₹3.5L incl. modular kitchen. EMI available.)"
                onChange={(e) => update(qa.id, { answer: e.target.value })}
                className="min-h-[72px]"
              />
              <Input
                value={qa.keywords?.join(", ") ?? ""}
                disabled={disabled}
                placeholder="Optional trigger keywords, comma-separated (price, cost, 2bhk)"
                onChange={(e) =>
                  update(qa.id, {
                    keywords: e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean),
                  })
                }
                className="mt-2 h-9 text-xs"
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled || atLimit}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Add quick answer
      </Button>
      {atLimit && (
        <p className="text-xs text-muted-foreground">
          You&apos;ve reached the maximum of {MAX_QUICK_ANSWERS} quick answers.
        </p>
      )}
    </div>
  );
}
