"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Button } from "@/components/ui/button";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { isEmailVerified, logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

function CheckEmailForm() {
  const router = useRouter();
  const { t } = useAuthI18n();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cooldownLeft, onCooldown, startCooldown } = useResendCooldown();

  useEffect(() => {
    if (isEmailVerified(user)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  async function resend() {
    if (onCooldown || loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/resend-verification", { method: "POST", body: "{}" });
      setSent(true);
      startCooldown();
    } catch (err) {
      setError(toUserMessage(err, t("auth.verify.resendFailed")));
    } finally {
      setLoading(false);
    }
  }

  const email = user?.email ?? "";

  return (
    <AuthShell
      title={t("auth.verify.checkTitle")}
      description={t("auth.verify.checkSubtitle").replace("{email}", email)}
    >
      {sent && !error && (
        <p className="auth-banner-success mb-4">{t("auth.verify.resendSuccess")}</p>
      )}
      {error && <p className="auth-banner-error mb-4">{error}</p>}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          className="auth-submit-modern"
          disabled={loading || onCooldown}
          onClick={() => void resend()}
        >
          {loading
            ? t("auth.verify.resending")
            : onCooldown
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
