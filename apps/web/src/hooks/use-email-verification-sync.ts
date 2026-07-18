"use client";

import { useEffect, useRef } from "react";
import { isEmailVerified, syncProfileFromServer } from "@/lib/auth-session";
import { subscribeEmailVerified } from "@/lib/email-verification-broadcast";
import { useAuthStore } from "@/stores/auth-store";

type Options = {
  /** Poll /auth/me while waiting (check-email page). */
  pollMs?: number;
  onVerified?: () => void;
};

/**
 * Keeps emailVerified in sync when the user verifies in another tab,
 * returns from the mail app, or clicks the link on /verify-email.
 */
export function useEmailVerificationSync(options?: Options) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const emailVerified = useAuthStore((s) => s.user?.emailVerified);
  const pollMs = options?.pollMs;
  const onVerifiedRef = useRef(options?.onVerified);
  onVerifiedRef.current = options?.onVerified;

  useEffect(() => {
    if (!accessToken || emailVerified) return;

    let cancelled = false;

    const sync = async () => {
      await syncProfileFromServer();
      if (cancelled) return;
      if (isEmailVerified(useAuthStore.getState().user)) {
        onVerifiedRef.current?.();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };

    void sync();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    const unsubscribe = subscribeEmailVerified(() => {
      void sync();
    });

    const poll =
      pollMs && pollMs > 0
        ? window.setInterval(() => {
            void sync();
          }, pollMs)
        : null;

    return () => {
      cancelled = true;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
      unsubscribe();
      if (poll) window.clearInterval(poll);
    };
  }, [accessToken, emailVerified, pollMs]);
}
