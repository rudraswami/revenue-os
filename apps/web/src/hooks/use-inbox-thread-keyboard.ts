"use client";

import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

/** Thread-pane shortcuts: focus composer, toggle search, quote last inbound. */
export function useInboxThreadKeyboard({
  enabled,
  onFocusComposer,
  onToggleSearch,
  onQuoteLastInbound,
}: {
  enabled: boolean;
  onFocusComposer: () => void;
  onToggleSearch: () => void;
  onQuoteLastInbound?: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        onToggleSearch();
        return;
      }

      if (e.key === "/" || (mod && e.key.toLowerCase() === "j")) {
        e.preventDefault();
        onFocusComposer();
        return;
      }

      if (e.key.toLowerCase() === "r" && onQuoteLastInbound) {
        e.preventDefault();
        onQuoteLastInbound();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onFocusComposer, onToggleSearch, onQuoteLastInbound]);
}
