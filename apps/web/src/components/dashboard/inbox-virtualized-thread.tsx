"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  estimateThreadMessageSize,
  InboxThreadMessageRow,
  type ThreadMessage,
} from "@/components/dashboard/inbox-thread-message-row";
import { getCopyableMessageText } from "@/lib/inbox-message-helpers";

export interface InboxVirtualizedThreadHandle {
  jumpToMessage: (messageId: string) => void;
  scrollToLatest: (smooth?: boolean) => void;
}

export interface InboxVirtualizedThreadProps {
  conversationId: string;
  messages: ThreadMessage[];
  contactLabel: string;
  hasOlderMessages: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void | Promise<void>;
  unreadDividerBeforeId: string | null;
  unreadDividerLabel: string;
  quotedMessageFor: (message: ThreadMessage) => ThreadMessage | null;
  highlightMessageId: string | null;
  activeSearchId: string | null;
  searchMatchSet: Set<string>;
  canSend: boolean;
  windowClosed: boolean;
  hasLead: boolean;
  messageFailedLabel: string;
  messageRetryLabel: string;
  replyingToYouLabel: string;
  replyingToAttachmentLabel: string;
  jumpToLatestLabel: string;
  lastMsgId?: string;
  scrollSmoothRef: React.MutableRefObject<boolean>;
  onQuote: (content: string | null, messageId: string) => void;
  onCopy: (content: string | null) => void;
  onPin: (content: string | null) => void;
  onFollowUp: (excerpt: string | null) => void;
  onRetry: (message: ThreadMessage) => void;
  canRetryMessage: (message: ThreadMessage) => boolean;
  onImageOpen: (messageId: string) => void;
  onHighlightMessage: (messageId: string) => void;
}

export const InboxVirtualizedThread = forwardRef<
  InboxVirtualizedThreadHandle,
  InboxVirtualizedThreadProps
>(function InboxVirtualizedThread(
  {
    conversationId,
    messages,
    contactLabel,
    hasOlderMessages,
    loadingOlder,
    onLoadOlder,
    unreadDividerBeforeId,
    unreadDividerLabel,
    quotedMessageFor,
    highlightMessageId,
    activeSearchId,
    searchMatchSet,
    canSend,
    windowClosed,
    hasLead,
    messageFailedLabel,
    messageRetryLabel,
    replyingToYouLabel,
    replyingToAttachmentLabel,
    jumpToLatestLabel,
    lastMsgId,
    scrollSmoothRef,
    onQuote,
    onCopy,
    onPin,
    onFollowUp,
    onRetry,
    canRetryMessage,
    onImageOpen,
    onHighlightMessage,
  },
  ref,
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevConvRef = useRef<string | null>(null);
  const restoreScrollRef = useRef<{ height: number; top: number } | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [topInset, setTopInset] = useState(0);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const m = messages[index];
      if (!m) return 72;
      return estimateThreadMessageSize(m, {
        hasQuoted: !!quotedMessageFor(m),
        hasUnreadDivider: unreadDividerBeforeId === m.id,
      });
    },
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const totalSize = virtualizer.getTotalSize();

  useLayoutEffect(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const inset = Math.max(0, c.clientHeight - totalSize - (hasOlderMessages ? 44 : 0));
    setTopInset(inset);
  }, [totalSize, hasOlderMessages, messages.length]);

  useImperativeHandle(
    ref,
    () => ({
      jumpToMessage(messageId: string) {
        const index = messages.findIndex((m) => m.id === messageId);
        if (index < 0) return;
        virtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" });
        onHighlightMessage(messageId);
      },
      scrollToLatest(smooth = true) {
        if (messages.length === 0) return;
        virtualizer.scrollToIndex(messages.length - 1, {
          align: "end",
          behavior: smooth ? "smooth" : "auto",
        });
        setShowJumpToLatest(false);
      },
    }),
    [messages, onHighlightMessage, virtualizer],
  );

  useEffect(() => {
    const c = scrollContainerRef.current;
    const isConvSwitch = prevConvRef.current !== conversationId;
    prevConvRef.current = conversationId;
    const nearBottom =
      !c || c.scrollHeight - c.scrollTop - c.clientHeight < 240;

    if (messages.length === 0) return;

    if (isConvSwitch || scrollSmoothRef.current || nearBottom) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: "end",
        behavior: scrollSmoothRef.current ? "smooth" : "auto",
      });
      setShowJumpToLatest(false);
    }
    scrollSmoothRef.current = false;
  }, [lastMsgId, conversationId, messages.length, virtualizer, scrollSmoothRef]);

  useLayoutEffect(() => {
    const restore = restoreScrollRef.current;
    const c = scrollContainerRef.current;
    if (!restore || !c) return;
    c.scrollTop = c.scrollHeight - restore.height + restore.top;
    restoreScrollRef.current = null;
  }, [messages.length, totalSize]);

  async function handleLoadOlder() {
    const c = scrollContainerRef.current;
    if (c) {
      restoreScrollRef.current = { height: c.scrollHeight, top: c.scrollTop };
    }
    await onLoadOlder();
  }

  function handleScroll() {
    const c = scrollContainerRef.current;
    if (!c) return;
    const distance = c.scrollHeight - c.scrollTop - c.clientHeight;
    setShowJumpToLatest(distance > 240);
  }

  return (
    <>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="conversation-thread-bg flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 custom-scrollbar lg:px-6"
      >
        <div className="mx-auto w-full max-w-3xl" style={{ paddingTop: topInset }}>
          {hasOlderMessages && (
            <div className="flex justify-center pb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                disabled={loadingOlder}
                onClick={() => void handleLoadOlder()}
              >
                {loadingOlder ? "Loading…" : "Load older messages"}
              </Button>
            </div>
          )}
          <div
            className="relative w-full"
            style={{ height: totalSize > 0 ? totalSize : undefined, minHeight: 1 }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const m = messages[virtualRow.index];
              if (!m) return null;
              const copyableText = getCopyableMessageText(m.content);
              const pinText = copyableText ?? m.content?.trim() ?? null;
              const quoted = quotedMessageFor(m);
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <InboxThreadMessageRow
                    message={m}
                    conversationId={conversationId}
                    contactLabel={contactLabel}
                    showUnreadDivider={unreadDividerBeforeId === m.id}
                    unreadDividerLabel={unreadDividerLabel}
                    quoted={quoted}
                    highlighted={highlightMessageId === m.id || activeSearchId === m.id}
                    searchActive={!!activeSearchId}
                    searchMatched={searchMatchSet.has(m.id)}
                    canQuote={canSend && !windowClosed && !!m.content}
                    canPin={
                      hasLead &&
                      canSend &&
                      !!pinText &&
                      !/^\[[^\]]+\]$/.test(pinText)
                    }
                    canFollowUp={hasLead && canSend && !!pinText}
                    canRetry={canRetryMessage(m)}
                    messageFailedLabel={messageFailedLabel}
                    messageRetryLabel={messageRetryLabel}
                    replyingToYouLabel={replyingToYouLabel}
                    replyingToAttachmentLabel={replyingToAttachmentLabel}
                    onQuote={
                      canSend && !windowClosed && m.content
                        ? () => onQuote(m.content, m.id)
                        : undefined
                    }
                    onCopy={copyableText ? () => onCopy(m.content) : undefined}
                    onPin={
                      hasLead && canSend && pinText ? () => onPin(m.content) : undefined
                    }
                    onFollowUp={
                      hasLead && canSend && pinText
                        ? () => onFollowUp(copyableText ?? m.content)
                        : undefined
                    }
                    onRetry={canRetryMessage(m) ? () => onRetry(m) : undefined}
                    onJumpToQuoted={
                      quoted
                        ? () => {
                            const index = messages.findIndex((row) => row.id === quoted.id);
                            if (index >= 0) {
                              virtualizer.scrollToIndex(index, {
                                align: "center",
                                behavior: "smooth",
                              });
                              onHighlightMessage(quoted.id);
                            }
                          }
                        : undefined
                    }
                    onImageOpen={onImageOpen}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showJumpToLatest && (
        <button
          type="button"
          onClick={() => {
            virtualizer.scrollToIndex(messages.length - 1, {
              align: "end",
              behavior: "smooth",
            });
            setShowJumpToLatest(false);
          }}
          aria-label={jumpToLatestLabel}
          title={jumpToLatestLabel}
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-lg transition hover:bg-muted active:scale-95"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}
    </>
  );
});
