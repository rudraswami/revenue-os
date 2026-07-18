"use client";

import { useAuthStore } from "@/stores/auth-store";
import { isEmailVerified } from "@/lib/auth-session";

export function useEmailVerified(): boolean {
  const user = useAuthStore((s) => s.user);
  return isEmailVerified(user);
}
