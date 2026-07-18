"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Button } from "@/components/ui/button";
import {
  apiFetch,
  isInvalidVerificationTokenError,
  isVerificationTokenExpiredError,
} from "@/lib/api-client";
import { syncProfileFromServer, postAuthPath } from "@/lib/auth-session";
import { broadcastEmailVerified } from "@/lib/email-verification-broadcast";
import { useAuthStore } from "@/stores/auth-store";

type VerifyState = "loading" | "success" | "already" | "expired" | "invalid" | "missing";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAuthI18n();
  const token = searchParams.get("token") ?? "";
  const setSession = useAuthStore((s) => s.setSession);
  const [state, setState] = useState<VerifyState>(token ? "loading" : "missing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void (async () => {
      try {
        const accessToken = useAuthStore.getState().accessToken;
        const res = await apiFetch<{
          ok: boolean;
          alreadyVerified?: boolean;
          emailVerified: string;
        }>("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
          skipAuthRetry: true,
          ...(accessToken ? { token: accessToken } : {}),
        });

        if (cancelled) return;

        setState(res.alreadyVerified ? "already" : "success");
        broadcastEmailVerified(res.emailVerified);

        const current = useAuthStore.getState();
        if (current.accessToken && current.user) {
          setSession({
            accessToken: current.accessToken,
            refreshToken: current.refreshToken ?? "",
            user: { ...current.user, emailVerified: res.emailVerified },
            organization: current.organization!,
            role: current.role!,
            onboarding: current.onboarding!,
          });
        } else {
          await syncProfileFromServer();
        }
      } catch (err) {
        if (cancelled) return;
        if (isVerificationTokenExpiredError(err)) {
          setState("expired");
          setError(err.message);
        } else if (isInvalidVerificationTokenError(err)) {
          setState("invalid");
          setError(err.message);
        } else {
          setState("invalid");
          setError(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, setSession]);

  const titles: Record<VerifyState, string> = {
    loading: t("auth.verify.verifying"),
    success: t("auth.verify.successTitle"),
    already: t("auth.verify.alreadyTitle"),
    expired: t("auth.verify.expiredTitle"),
    invalid: t("auth.verify.invalidTitle"),
    missing: t("auth.verify.missingTitle"),
  };

  const descriptions: Record<VerifyState, string> = {
    loading: t("auth.verify.verifyingSub"),
    success: t("auth.verify.successSub"),
    already: t("auth.verify.alreadySub"),
    expired: t("auth.verify.expiredSub"),
    invalid: error ?? t("auth.verify.invalidSub"),
    missing: t("auth.verify.missingSub"),
  };

  return (
    <AuthShell title={titles[state]} description={descriptions[state]}>
      {state === "loading" && (
        <p className="text-sm text-muted-foreground">{t("auth.verify.oneMoment")}</p>
      )}
      {(state === "success" || state === "already") && (
        <Button
          className="auth-submit-modern"
          onClick={() => router.push(postAuthPath(useAuthStore.getState().onboarding))}
        >
          {t("auth.verify.goDashboard")}
        </Button>
      )}
      {(state === "expired" || state === "invalid" || state === "missing") && (
        <div className="flex flex-col gap-3">
          <Button asChild className="auth-submit-modern">
            <Link href="/verify-email/check">{t("auth.verify.sendNewLink")}</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl">
            <Link href="/login">{t("auth.signIn")}</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#fafbfc]">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
