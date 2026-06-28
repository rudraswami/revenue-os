"use client";

import { ChevronDown, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONVERSATIONS } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

export function InboxComposer({
  draft,
  onDraftChange,
  onSend,
  sendPending,
  sendDisabled,
  sendError,
  showAiSuggest,
  suggestPending,
  onSuggest,
  templates,
  composeRef,
  onMinimize,
}: {
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: (e: React.FormEvent) => void;
  sendPending: boolean;
  sendDisabled: boolean;
  sendError: string | null;
  showAiSuggest: boolean;
  suggestPending: boolean;
  onSuggest: () => void;
  templates?: Array<{ id: string; title: string; body: string }>;
  composeRef?: React.RefObject<HTMLInputElement | null>;
  onMinimize: () => void;
}) {
  return (
    <form onSubmit={onSend} className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_2px_12px_rgb(11_28_48/0.06)]">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-gradient-to-r from-[#f8f9ff] to-white px-3 py-2">
        <p className="text-xs font-semibold text-foreground">{CONVERSATIONS.composeTitle}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={onMinimize}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {CONVERSATIONS.minimizeComposer}
        </Button>
      </div>

      <div className="space-y-2.5 p-3">
        {sendError && (
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <p className="font-medium">{sendError}</p>
            {(sendError.toLowerCase().includes("auth") ||
              sendError.toLowerCase().includes("token")) && (
              <a
                href="/dashboard/settings?tab=whatsapp"
                className="mt-1 inline-block font-semibold underline"
              >
                Refresh WhatsApp token →
              </a>
            )}
          </div>
        )}

        {(templates?.length ?? 0) > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
            {templates!.map((t) => (
              <button
                key={t.id}
                type="button"
                className="shrink-0 rounded-full border border-border/80 bg-[#f8f9ff] px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-accent/40 hover:bg-white hover:text-accent"
                onClick={() => onDraftChange(t.body)}
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 rounded-xl border border-border/80 bg-[#f8f9ff]/80 px-3 py-2 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/15">
            <Input
              ref={composeRef}
              placeholder={CONVERSATIONS.composePlaceholder}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              disabled={sendPending || sendDisabled}
              className="h-auto min-h-[2.25rem] border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0 md:text-sm"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {showAiSuggest && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-10 gap-1.5 rounded-xl border-accent/25 bg-[#ecfdf5]/60 px-2.5 text-accent hover:bg-[#ecfdf5] hover:text-accent",
                  "max-sm:h-10 max-sm:w-10 max-sm:px-0",
                )}
                disabled={suggestPending}
                onClick={onSuggest}
                title={CONVERSATIONS.draftWithAi}
              >
                {suggestPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="hidden font-semibold sm:inline">{CONVERSATIONS.draftWithAi}</span>
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              className="h-10 gap-1.5 rounded-xl bg-accent px-3.5 hover:bg-accent-hover"
              disabled={!draft.trim() || sendPending || sendDisabled}
            >
              {sendPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden font-semibold sm:inline">{CONVERSATIONS.sendReply}</span>
            </Button>
          </div>
        </div>

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          {CONVERSATIONS.composeFooter}
        </p>
      </div>
    </form>
  );
}
