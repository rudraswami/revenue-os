"use client";

import { useCallback, useState } from "react";

/** Pause auto-play when the user is exploring a live section. */
export function usePauseHover() {
  const [paused, setPaused] = useState(false);
  const pauseProps = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onPointerEnter: () => setPaused(true),
    onPointerLeave: () => setPaused(false),
  };
  const resume = useCallback(() => setPaused(false), []);
  return { paused, pauseProps, resume };
}
