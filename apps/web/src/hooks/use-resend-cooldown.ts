"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_MS = 60_000;

/** Client-side resend cooldown with a live second-by-second countdown. */
export function useResendCooldown(cooldownMs = DEFAULT_MS) {
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  const onCooldown = cooldownLeft > 0;

  const startCooldown = useCallback(() => {
    setCooldownUntil(Date.now() + cooldownMs);
  }, [cooldownMs]);

  return { cooldownLeft, onCooldown, startCooldown };
}
