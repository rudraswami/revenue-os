"use client";

import { useProactiveTokenRefresh } from "@/hooks/use-proactive-token-refresh";

/** Silent background refresh — no UI. */
export function ProactiveTokenRefresh() {
  useProactiveTokenRefresh();
  return null;
}
