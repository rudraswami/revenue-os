"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { useEmailVerified } from "@/hooks/use-email-verified";
import { useEmailVerificationSync } from "@/hooks/use-email-verification-sync";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAuthStore } from "@/stores/auth-store";

export function EmailVerificationBanner() {
  useEmailVerificationSync();

  const verified = useEmailVerified();
  const email = useAuthStore((s) => s.user?.email);
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cooldownLeft, onCooldown, startCooldown } = useResendCooldown();

  if (verified) return null;

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

  return (
    <div
      className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <div>
            <p className="font-medium">{t("auth.verify.bannerTitle")}</p>
            {email && (
              <p className="mt-0.5 text-xs text-amber-800/90">
                {t("auth.verify.bannerSentTo").replace("{email}", email)}
              </p>
            )}
            {sent && !error && (
              <p className="mt-1 text-xs text-emerald-800">{t("auth.verify.bannerResent")}</p>
            )}
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-6 sm:pl-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
            disabled={loading || onCooldown}
            onClick={() => void resend()}
          >
            {loading
              ? t("auth.verify.bannerSending")
              : onCooldown
                ? t("auth.verify.bannerResendCooldown").replace("{n}", String(cooldownLeft))
                : t("auth.verify.bannerResend")}
          </Button>
          <Button
            asChild
            size="sm"
            className="h-8 rounded-lg bg-amber-900 text-white hover:bg-amber-950"
          >
            <Link href="/verify-email/check">{t("auth.verify.bannerCheckStatus")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
