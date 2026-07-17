"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { hasSessionHint } from "@/lib/auth-cookie";
import { customerMessageForRefresh } from "@/lib/auth-session-death";
import { refreshSession } from "@/lib/auth-refresh";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const transient = useAuthStore((s) => s.lastTransientFailure);

  useEffect(() => {
    if (!hydrated) return;
    if (accessToken) return;
    // Recoverable: cookie/hint still present or last refresh was transient
    if (hasSessionHint() || transient) return;
    router.replace("/login");
  }, [hydrated, accessToken, transient, router]);

  useEffect(() => {
    if (!hydrated || accessToken || !transient) return;
    const onOnline = () => {
      void refreshSession("auth_guard_online");
    };
    window.addEventListener("online", onOnline);
    // Opportunistic retry while showing reconnecting UI
    const timer = window.setTimeout(() => {
      void refreshSession("auth_guard_retry");
    }, 2000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearTimeout(timer);
    };
  }, [hydrated, accessToken, transient]);

  if (!hydrated) {
    return <LoadingScreen message="Loading your workspace…" />;
  }

  if (!accessToken) {
    if (hasSessionHint() || transient) {
      const msg = transient
        ? customerMessageForRefresh(transient)
        : "Reconnecting to your workspace…";
      return <LoadingScreen message={msg} />;
    }
    return <LoadingScreen message="Loading your workspace…" />;
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    router.replace("/dashboard");
  }, [hydrated, accessToken, router]);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  if (accessToken) {
    return <LoadingScreen message="Redirecting…" />;
  }

  return <>{children}</>;
}
