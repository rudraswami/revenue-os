"use client";

import { useAuthStore } from "@/stores/auth-store";

/** Narrow selector — only rerenders when the verified flag itself flips. */
export function useEmailVerified(): boolean {
  return useAuthStore((s) => !!s.user?.emailVerified);
}
