"use client";

import { ChevronDown, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
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
  composeRef?: React.RefObject<HTMLTextAreaElement | null>;
  onMinimize: () => void;
}) {
  const copy = useConversationsCopy();

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim() && !sendPending && !sendDisabled) {
        onSend(e as unknown as React.FormEvent);
      }
    }
  }

  return (
    <form onSubmit={onSend} className="w-full">
      {sendError && (
        <div className="mb-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
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
          {(sendError.toLowerCase().includes("24-hour") ||
            sendError.toLowerCase().includes("template")) && (
            <a href="/dashboard/inbox" className="mt-1 inline-block font-semibold underline">
              Use New message with a template →
            </a>
          )}
        </div>
      )}

      {(templates?.length ?? 0) > 0 && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
          {templates!.map((t) => (
            <button
              key={t.id}
              type="button"
              className="shrink-0 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-accent/30 hover:text-foreground"
              onClick={() => onDraftChange(t.body)}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_8px_rgb(11_28_48/0.05)]">
        <textarea
          ref={composeRef}
          rows={2}
          placeholder={copy.composePlaceholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sendPending || sendDisabled}
          className={cn(
            "block w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-relaxed text-foreground",
            "placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0",
            "min-h-[3.25rem] max-h-32 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />

        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/80 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {showAiSuggest && (
              <button
                type="button"
                disabled={suggestPending}
                onClick={onSuggest}
                className="shrink-0 text-xs font-semibold text-accent underline-offset-2 transition hover:underline disabled:opacity-50"
              >
                {suggestPending ? copy.drafting : copy.draftWithAi}
              </button>
            )}
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {copy.composeFooter}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onMinimize}
              className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{copy.minimizeComposer}</span>
            </button>
            <Button
              type="submit"
              size="sm"
              className="h-9 min-w-[4.5rem] rounded-lg bg-accent px-4 font-semibold hover:bg-accent-hover"
              disabled={!draft.trim() || sendPending || sendDisabled}
            >
              {sendPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5 sm:hidden" />
                  {copy.sendReply}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-center text-xs text-muted-foreground sm:hidden">
        {copy.composeFooter}
      </p>
    </form>
  );
}
