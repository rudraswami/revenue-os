"use client";

import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

export function useInboxKeyboard({
  enabled,
  conversationIds,
  selectedId,
  onSelect,
  onClearSelection,
  onOpenCommandPalette,
}: {
  enabled: boolean;
  conversationIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  onOpenCommandPalette: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }

      if (conversationIds.length === 0) return;

      if (e.key === "Escape" && selectedId) {
        e.preventDefault();
        onClearSelection();
        return;
      }

      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const currentIndex = selectedId
          ? conversationIds.indexOf(selectedId)
          : -1;
        const delta = e.key === "j" ? 1 : -1;
        const nextIndex =
          currentIndex < 0
            ? delta > 0
              ? 0
              : conversationIds.length - 1
            : Math.min(
                conversationIds.length - 1,
                Math.max(0, currentIndex + delta),
              );
        const nextId = conversationIds[nextIndex];
        if (nextId && nextId !== selectedId) onSelect(nextId);
        return;
      }

      if (e.key === "Enter" && !selectedId && conversationIds[0]) {
        e.preventDefault();
        onSelect(conversationIds[0]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    conversationIds,
    selectedId,
    onSelect,
    onClearSelection,
    onOpenCommandPalette,
  ]);
}
