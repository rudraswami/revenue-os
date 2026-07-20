"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { loginRedirectPath } from "@/lib/auth-login-reason";
import { hasSessionHint } from "@/lib/auth-cookie";
import { canRenderDashboardWhileRestoringSession } from "@/lib/auth-bootstrap-policy";
import { refreshSession } from "@/lib/auth-refresh";
import { customerMessageForRefresh } from "@/lib/auth-session-death";
import { startBootstrapAuth } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  // Narrow to the only field the render decision needs (user.id) so profile
  // syncs (/auth/me replacing the whole user object) don't rerender the
  // entire dashboard tree that AuthGuard wraps.
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const transient = useAuthStore((s) => s.lastTransientFailure);
  const lastLogoutReason = useAuthStore((s) => s.lastLogoutReason);
  const sessionHint = hasSessionHint();
  const restoringSession = !accessToken && (!!sessionHint || !!transient);

  useEffect(() => {
    if (!hydrated) return;
    if (accessToken) return;
    if (sessionHint || transient) return;
    router.replace(loginRedirectPath(lastLogoutReason));
  }, [hydrated, accessToken, sessionHint, transient, lastLogoutReason, router]);

  useEffect(() => {
    if (!hydrated || accessToken) return;
    if (sessionHint || transient) {
      void startBootstrapAuth();
    }
  }, [hydrated, accessToken, sessionHint, transient]);

  useEffect(() => {
    if (!hydrated || accessToken || !transient) return;
    const onOnline = () => {
      void refreshSession("auth_guard_online");
    };
    window.addEventListener("online", onOnline);
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

  if (
    canRenderDashboardWhileRestoringSession({
      accessToken,
      user: userId ? { id: userId } : null,
      hasSessionHint: sessionHint,
      hasTransientFailure: !!transient,
    })
  ) {
    return <>{children}</>;
  }

  if (restoringSession) {
    const msg = transient
      ? customerMessageForRefresh(transient)
      : "Reconnecting to your workspace…";
    return <LoadingScreen message={msg} />;
  }

  return <LoadingScreen message="Loading your workspace…" />;
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
