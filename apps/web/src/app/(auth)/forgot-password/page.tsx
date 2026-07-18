"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Button } from "@/components/ui/button";
import { apiFetch, toUserMessage } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const { t } = useAuthI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean; message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        skipAuthRetry: true,
      });
      setSent(true);
    } catch (err) {
      setError(toUserMessage(err, t("auth.forgotFailed")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("auth.forgotTitle")} description={t("auth.forgotSubtitle")} showMobileHero={false}>
      {sent ? (
        <div className="auth-form space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent ring-1 ring-accent/15">
            <Mail className="h-5 w-5" />
          </div>
          <p className="text-[14px] leading-relaxed text-muted-foreground">{t("auth.forgotSent")}</p>
          <Button className="auth-submit-modern" asChild>
            <Link href="/login">{t("auth.backToSignIn")}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="auth-form space-y-4">
          <AuthField
            id="email"
            type="email"
            label={t("auth.email")}
            variant="modern"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="auth-banner-error" role="alert">{error}</p>}
          <div className="space-y-3 pt-2">
            <Button type="submit" className="auth-submit-modern" disabled={loading}>
              {loading ? t("auth.sending") : t("auth.sendResetLink")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-accent hover:underline">
                {t("auth.backToSignIn")}
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
