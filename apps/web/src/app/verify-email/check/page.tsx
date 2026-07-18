"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AuthPageTransition } from "@/components/auth/auth-page-transition";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Button } from "@/components/ui/button";
import { useEmailVerificationSync } from "@/hooks/use-email-verification-sync";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { isEmailVerified, logout, postAuthPath } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

function CheckEmailForm() {
  const router = useRouter();
  const { t } = useAuthI18n();
  const user = useAuthStore((s) => s.user);
  const [resendLoading, setResendLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(() => isEmailVerified(user));
  const { cooldownLeft, onCooldown, startCooldown } = useResendCooldown();

  const handleVerified = useCallback(() => {
    setVerified(true);
  }, []);

  useEmailVerificationSync({
    pollMs: 4000,
    onVerified: handleVerified,
  });

  useEffect(() => {
    if (isEmailVerified(user)) {
      setVerified(true);
    }
  }, [user?.emailVerified, user]);

  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => {
      router.replace(postAuthPath(useAuthStore.getState().onboarding));
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [verified, router]);

  async function resend() {
    if (onCooldown || resendLoading || verified) return;
    setResendLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/resend-verification", { method: "POST", body: "{}" });
      setSent(true);
      startCooldown();
    } catch (err) {
      setError(toUserMessage(err, t("auth.verify.resendFailed")));
    } finally {
      setResendLoading(false);
    }
  }

  const email = user?.email ?? "";

  if (verified) {
    return (
      <AuthPageTransition>
        <AuthShell
          title={t("auth.verify.successTitle")}
          description={t("auth.verify.successSub")}
        >
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ecfdf5] ring-1 ring-accent/20">
              <CheckCircle2 className="h-7 w-7 text-accent" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">{t("auth.verify.checkVerified")}</p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t("auth.verify.redirecting")}
            </p>
          </div>
        </AuthShell>
      </AuthPageTransition>
    );
  }

  return (
    <AuthPageTransition>
      <AuthShell
        title={t("auth.verify.checkTitle")}
        description={t("auth.verify.checkSubtitle").replace("{email}", email)}
      >
        <div className="mb-5 flex items-start gap-3 rounded-xl bg-muted/50 px-3.5 py-3 ring-1 ring-border/60">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">{t("auth.verify.checkWaiting")}</p>
        </div>

        {sent && !error && (
          <p className="auth-banner-success mb-4">{t("auth.verify.resendSuccess")}</p>
        )}
        {error && <p className="auth-banner-error mb-4">{error}</p>}

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="auth-submit-modern border-border bg-card"
            isLoading={resendLoading}
            disabled={resendLoading || onCooldown}
            onClick={() => void resend()}
          >
            {onCooldown
              ? t("auth.verify.resendCooldown").replace("{n}", String(cooldownLeft))
              : t("auth.verify.resend")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t("auth.verify.checkInboxHint")}</p>
          <button
            type="button"
            className="text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => void logout().then(() => router.push("/register"))}
          >
            {t("auth.verify.wrongEmail")}
          </button>
        </div>
      </AuthShell>
    </AuthPageTransition>
  );
}

export default function VerifyEmailCheckPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="grid min-h-screen place-items-center bg-[#fafbfc]">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        }
      >
        <CheckEmailForm />
      </Suspense>
    </AuthGuard>
  );
}
