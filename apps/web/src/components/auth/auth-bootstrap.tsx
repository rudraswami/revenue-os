"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { bootstrapAuth } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

/** Runs once after persist rehydration to refresh tokens and sync /auth/me. */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!refreshToken) {
      setReady(true);
      return;
    }

    void bootstrapAuth().finally(() => setReady(true));
  }, [hydrated, refreshToken]);

  if (!hydrated || (refreshToken && !ready)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
