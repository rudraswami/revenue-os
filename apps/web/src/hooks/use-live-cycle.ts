"use client";

import { useEffect, useRef, useState } from "react";

/** Auto-advance with smooth progress — pauses cleanly on hover. */
export function useLiveCycle({
  enabled,
  durationMs,
  paused,
  onAdvance,
}: {
  enabled: boolean;
  durationMs: number;
  paused: boolean;
  onAdvance: () => void;
}) {
  const [cycleKey, setCycleKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      elapsedRef.current = 0;
      return;
    }
    if (paused) return;

    let raf = 0;
    const start = performance.now() - elapsedRef.current;

    const tick = (now: number) => {
      const elapsed = now - start;
      elapsedRef.current = elapsed;
      const p = Math.min(elapsed / durationMs, 1);
      setProgress(p);

      if (p >= 1) {
        elapsedRef.current = 0;
        setProgress(0);
        setCycleKey((k) => k + 1);
        onAdvanceRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, paused, durationMs, cycleKey]);

  const reset = () => {
    elapsedRef.current = 0;
    setProgress(0);
    setCycleKey((k) => k + 1);
  };

  return { cycleKey, progress, reset };
}

/** Loop progress for timeout-driven films (hero, layer). */
export function useFilmProgress({
  enabled,
  durationMs,
  runKey,
  paused = false,
}: {
  enabled: boolean;
  durationMs: number;
  runKey: number;
  paused?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(0);
      elapsedRef.current = 0;
      return;
    }
    if (paused) return;

    let raf = 0;
    const start = performance.now() - elapsedRef.current;

    const tick = (now: number) => {
      const elapsed = now - start;
      elapsedRef.current = elapsed;
      const p = Math.min(elapsed / durationMs, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, durationMs, runKey, paused]);

  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, [runKey]);

  return progress;
}
