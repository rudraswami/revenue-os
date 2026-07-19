"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loginRedirectPath } from "@/lib/auth-login-reason";
import { subscribeSessionEnded } from "@/lib/auth-session-broadcast";
import type { LogoutReason } from "@/lib/auth-session-death";
import { useAuthStore } from "@/stores/auth-store";

/**
 * When another tab signs out or the session dies, clear this tab and send user to login.
 */
export function useCrossTabLogoutSync() {
  const router = useRouter();

  useEffect(() => {
    return subscribeSessionEnded((reason: LogoutReason) => {
      const { accessToken, clear } = useAuthStore.getState();
      if (!accessToken) return;
      clear(reason, { skipBroadcast: true });
      router.replace(loginRedirectPath(reason));
    });
  }, [router]);
}
