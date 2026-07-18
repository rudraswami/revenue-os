"use client";

import { useEffect } from "react";
import { initSentryClient } from "@/lib/sentry";

/** One-time client Sentry bootstrap. */
export function SentryInit() {
  useEffect(() => {
    initSentryClient();
  }, []);
  return null;
}
