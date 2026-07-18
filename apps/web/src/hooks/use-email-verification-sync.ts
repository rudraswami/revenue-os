"use client";

import { useEffect } from "react";
import { isEmailVerified, syncProfileFromServer } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Keeps emailVerified in sync when the user verifies in another tab
 * or returns to this tab after verifying elsewhere.
 */
export function useEmailVerificationSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!accessToken || isEmailVerified(user)) return;

    const sync = () => {
      void syncProfileFromServer();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken, user?.emailVerified]);
}
