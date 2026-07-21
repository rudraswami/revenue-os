import { useEffect, useState } from "react";

/**
 * Platform motion tokens — the single source of truth for animation timing.
 *
 * Durations are exposed in seconds (for framer-motion) and milliseconds
 * (for CSS variables / setTimeout). Keep animations short and purposeful:
 * motion should support usability, never decorate.
 */
export const MOTION = {
  duration: { fast: 0.12, base: 0.18, slow: 0.24 },
  durationMs: { fast: 120, base: 180, slow: 240 },
  /** Standard decelerate easing — the default "native" feel. */
  ease: [0.2, 0, 0, 1] as [number, number, number, number],
  /** Emphasized ease-out for entrances. */
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const;

/**
 * Growvisi DS v1 — single interaction standard (applies app-wide):
 * - Hover (color/bg/border): 120ms, standard ease. No layout shift on hover.
 * - Press: active:scale-[0.98] (buttons/tiles); disabled under reduced-motion.
 * - Overlays (Dialog/Sheet/Toast): 150-180ms enter; see `gv-animate-*` in globals.css.
 * - Popover/DropdownMenu: 150ms enter / 120ms exit via `gv-animate-pop` (Radix data-state).
 * - Tooltip: 120ms enter via `gv-animate-tooltip`; 200ms open delay.
 * - Route/tab crossfade: `MOTION.duration.base` opacity fade (see dashboard/template.tsx).
 * - Everything must no-op under prefers-reduced-motion.
 */

/** framer-motion transition presets. */
export const TRANSITIONS = {
  fade: { duration: MOTION.duration.base, ease: MOTION.ease },
  fast: { duration: MOTION.duration.fast, ease: MOTION.ease },
} as const;

/** Crossfade variants for route/content transitions. */
export const crossfadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
} as const;

/** SSR-safe reduced-motion check for imperative code paths. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reactive reduced-motion preference. Starts `false` to avoid hydration mismatch. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
