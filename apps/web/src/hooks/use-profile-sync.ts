"use client";

import { useEffect } from "react";
import { syncProfileFromServer } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

/** Keep role/profile in sync when an admin changes permissions. */
export function useProfileSync() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    void syncProfileFromServer();

    const onFocus = () => void syncProfileFromServer();
    const interval = window.setInterval(() => void syncProfileFromServer(), 60_000);

    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [hydrated, accessToken]);
}
