"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Languages, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { InboxEmojiPicker } from "@/components/dashboard/inbox-emoji-picker";
import { InboxQuickRepliesDrawer } from "@/components/dashboard/inbox-quick-replies-drawer";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import {
  applyTemplateToDraft,
  filterSlashTemplates,
  insertAtCursor,
  parseQuotedReply,
  stripQuotedReply,
} from "@/lib/inbox-composer-helpers";
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
  draftSources,
  templates,
  composeRef,
  onMinimize,
  draftNote,
  attachment,
  onAttachFile,
  onClearAttachment,
  attachInputRef,
  onTranslateDraft,
  translatePending,
  showTranslate,
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
  draftSources?: Array<{ title: string; citation?: string }>;
  templates?: Array<{ id: string; title: string; body: string }>;
  composeRef?: React.RefObject<HTMLTextAreaElement | null>;
  onMinimize?: () => void;
  draftNote?: string | null;
  attachment?: { name: string; previewUrl?: string; kind: "image" | "document" } | null;
  onAttachFile?: (file: File) => void;
  onClearAttachment?: () => void;
  attachInputRef?: React.RefObject<HTMLInputElement | null>;
  onTranslateDraft?: (target: "hi" | "en") => void;
  translatePending?: boolean;
  showTranslate?: boolean;
}) {
  const copy = useConversationsCopy();
  const [dragActive, setDragActive] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const slashMatches = useMemo(
    () => filterSlashTemplates(draft, templates ?? []),
    [draft, templates],
  );
  const showSlashMenu = draft.startsWith("/") && slashMatches.length > 0;
  const { body: draftBody } = parseQuotedReply(draft);
  const showTemplateChips =
    (templates?.length ?? 0) > 0 && !draft.startsWith("/") && !attachment && !draftBody.trim();
  const visibleTemplates = templates?.slice(0, 3) ?? [];
  const hasMoreTemplates = (templates?.length ?? 0) > 3;
  const { quote } = parseQuotedReply(draft);
  const canDrop = !!onAttachFile && !sendDisabled && !sendPending;
  const translateTarget: "hi" | "en" = copy.locale === "hi" ? "en" : "hi";
  const canTranslate =
    !!showTranslate && !!onTranslateDraft && !!draftBody.trim() && !sendDisabled && !sendPending;

  function handleEmojiPick(emoji: string) {
    const el = composeRef?.current;
    if (!el) {
      onDraftChange(draft + emoji);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const { next, cursor } = insertAtCursor(draft, emoji, start, end);
    onDraftChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  function handleTemplateSelect(body: string) {
    onDraftChange(applyTemplateToDraft(draft, body));
    composeRef?.current?.focus();
  }

  function handleClearQuote() {
    onDraftChange(stripQuotedReply(draft));
  }

  function handleDragOver(e: React.DragEvent<HTMLFormElement>) {
    if (!canDrop) return;
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLFormElement>) {
    if (!canDrop) return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent<HTMLFormElement>) {
    if (!canDrop) return;
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onAttachFile?.(file);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!onAttachFile || sendDisabled || sendPending || attachment) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onAttachFile(file);
          return;
        }
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showSlashMenu && e.key === "Escape") {
      e.preventDefault();
      onDraftChange("");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((draft.trim() || attachment) && !sendPending && !sendDisabled) {
        onSend(e as unknown as React.FormEvent);
      }
    }
  }

  return (
    <form
      onSubmit={onSend}
      className={cn("relative w-full", dragActive && "ring-2 ring-accent/40 ring-offset-2 rounded-2xl")}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-accent/10 backdrop-blur-[1px]">
          <p className="rounded-full bg-card px-4 py-2 text-xs font-semibold text-accent shadow-sm">
            {copy.dropToAttach}
          </p>
        </div>
      )}
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

      {(templates?.length ?? 0) > 0 && showTemplateChips && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
          {visibleTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="shrink-0 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-accent/30 hover:text-foreground"
              onClick={() => handleTemplateSelect(t.body)}
            >
              {t.title}
            </button>
          ))}
          {hasMoreTemplates && (
            <button
              type="button"
              className="shrink-0 rounded-lg border border-dashed border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-accent shadow-sm transition hover:border-accent/30"
              onClick={() => setQuickRepliesOpen(true)}
            >
              {copy.quickRepliesMore}
            </button>
          )}
        </div>
      )}

      {templates && templates.length > 0 && (
        <InboxQuickRepliesDrawer
          open={quickRepliesOpen}
          onOpenChange={setQuickRepliesOpen}
          templates={templates}
          onSelect={handleTemplateSelect}
        />
      )}

      {draftNote && (
        <p className="mb-1.5 text-xs text-muted-foreground">{draftNote}</p>
      )}

      {quote && (
        <div className="mb-2 flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-accent/50 pl-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
              {copy.quotePreviewLabel}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{quote}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={handleClearQuote}
            aria-label={copy.clearQuote}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2">
          {attachment.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.previewUrl}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-muted-foreground">
              PDF
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{attachment.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {attachment.kind === "image" ? copy.attachImageHint : copy.attachDocumentHint}
            </p>
          </div>
          {onClearAttachment && (
            <button
              type="button"
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onClearAttachment}
              aria-label={copy.attachRemove}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <input
        ref={attachInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAttachFile?.(file);
          e.target.value = "";
        }}
      />

      {(draftSources?.length ?? 0) > 0 && (
        <p className="mb-2 text-xs text-muted-foreground">
          <span className="font-semibold text-accent">Sources:</span>{" "}
          {draftSources!.map((s) => s.citation ?? s.title).join(" · ")}
        </p>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_8px_rgb(11_28_48/0.05)]">
        {showSlashMenu && (
          <ul className="absolute bottom-full left-0 right-0 z-10 mb-1 max-h-40 overflow-y-auto rounded-xl border border-border/80 bg-card py-1 shadow-lg">
            {slashMatches.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/80"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onDraftChange(applyTemplateToDraft(draft, t.body))}
                >
                  <span className="text-xs font-semibold text-foreground">/{t.title}</span>
                  <span className="line-clamp-1 text-[11px] text-muted-foreground">{t.body}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={composeRef}
          rows={2}
          placeholder={copy.composePlaceholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
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
            {!draftNote && !draft.startsWith("/") && (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {copy.composeFooter}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!sendDisabled && (
              <InboxEmojiPicker onPick={handleEmojiPick} disabled={sendPending} />
            )}
            {canTranslate && (
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                disabled={translatePending}
                onClick={() => onTranslateDraft?.(translateTarget)}
                aria-label={
                  translateTarget === "hi" ? copy.translateToHindi : copy.translateToEnglish
                }
                title={translateTarget === "hi" ? copy.translateToHindi : copy.translateToEnglish}
              >
                {translatePending ? (
                  <GrowvisiSpinner size="xs" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
              </button>
            )}
            {onAttachFile && attachInputRef && !sendDisabled && (
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                disabled={sendPending}
                onClick={() => attachInputRef.current?.click()}
                aria-label={copy.attachFile}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            )}
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{copy.minimizeComposer}</span>
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              className="h-9 min-w-[4.5rem] rounded-lg bg-accent px-4 font-semibold hover:bg-accent-hover"
              disabled={(!draft.trim() && !attachment) || sendPending || sendDisabled}
            >
              {sendPending ? (
                <GrowvisiSpinner size="xs" />
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

      {!draftNote && (
        <p className="mt-1.5 text-center text-xs text-muted-foreground sm:hidden">
          {copy.composeFooter}
        </p>
      )}
    </form>
  );
}
