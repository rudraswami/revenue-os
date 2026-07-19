"use client";

import { useAuthMe } from "@/hooks/use-auth-me";

/** @deprecated Use useAuthMe — kept for dashboard shell import stability. */
export function useProfileSync() {
  useAuthMe();
}
