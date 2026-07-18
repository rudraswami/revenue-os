"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Button } from "@/components/ui/button";
import { apiFetch, toUserMessage } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAuthI18n();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t("auth.invalidResetLink"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        skipAuthRetry: true,
      });
      router.replace("/login?reset=1");
    } catch (err) {
      setError(toUserMessage(err, t("auth.resetFailed")));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-form space-y-5 text-center">
        <p className="text-sm text-destructive">{t("auth.invalidResetLink")}</p>
        <Button className="auth-submit-modern" asChild>
          <Link href="/forgot-password">{t("auth.requestNewLink")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="auth-form space-y-4">
      <AuthField
        id="password"
        type="password"
        label={t("auth.newPassword")}
        variant="modern"
        autoComplete="new-password"
        placeholder={t("auth.passwordPlaceholder")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={t("auth.passwordHint")}
        minLength={8}
        showPasswordToggle
        required
      />
      {error && <p className="auth-banner-error" role="alert">{error}</p>}
      <div className="pt-2">
        <Button type="submit" className="auth-submit-modern" disabled={loading}>
          {loading ? t("auth.updating") : t("auth.updatePassword")}
        </Button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useAuthI18n();

  return (
    <AuthShell title={t("auth.resetTitle")} description={t("auth.resetSubtitle")} showMobileHero={false}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t("auth.loading")}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
