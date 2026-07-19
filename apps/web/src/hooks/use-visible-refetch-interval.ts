"use client";

import { useEffect, useState } from "react";

/**
 * Pauses React Query polling while the tab is hidden.
 * Returns the base interval only when the document is visible.
 */
export function useVisibleRefetchInterval(intervalMs: number | false): number | false {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  if (!visible || intervalMs === false) return false;
  return intervalMs;
}
