"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Button } from "@/components/ui/button";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { withAuthQuery } from "@/lib/auth-links";
import { applySession, postAuthRedirect } from "@/lib/auth-session";
import { CTA } from "@/lib/brand-copy";
import type { AuthSession, LoginResult, OrganizationOption } from "@/lib/auth-types";
import { isAuthSession } from "@/lib/auth-types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAuthI18n();
  const resetDone = searchParams.get("reset") === "1";
  const deletedDone = searchParams.get("deleted") === "1";
  const inviteToken = searchParams.get("invite") ?? "";
  const inviteEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const registerHref = withAuthQuery("/register", searchParams);

  async function submitLogin(organizationId?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<LoginResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, organizationId }),
      });

      if (!isAuthSession(res)) {
        setOrganizations(res.organizations);
        setLoading(false);
        return;
      }

      applySession(res as AuthSession);
      setLoading(false);

      if (inviteToken) {
        router.push(`/invite?token=${encodeURIComponent(inviteToken)}`);
        return;
      }

      const next = searchParams.get("next");
      const safeNext =
        next?.startsWith("/dashboard") || next?.startsWith("/onboarding") ? next : null;
      router.push(safeNext ?? postAuthRedirect(res as AuthSession));
    } catch (err) {
      setError(toUserMessage(err, t("auth.signInFailed")));
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextErrors.email = t("auth.emailRequired");
    if (!password) nextErrors.password = t("auth.passwordRequired");
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    void submitLogin();
  }

  return (
    <AuthShell title={t("auth.loginTitle")} description={t("auth.loginSubtitle")} showMobileHero>
      {resetDone && (
        <p className="auth-banner-success mb-5">{t("auth.passwordUpdated")}</p>
      )}
      {deletedDone && (
        <p className="auth-banner-success mb-5">{t("auth.accountDeleted")}</p>
      )}

      {!organizations ? (
        <form onSubmit={onSubmit} className="auth-form space-y-4" noValidate>
          <AuthField
            id="email"
            name="email"
            label={t("auth.email")}
            type="email"
            variant="modern"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            error={fieldErrors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            required
          />
          <AuthField
            id="password"
            name="password"
            label={t("auth.password")}
            type="password"
            variant="modern"
            autoComplete="current-password"
            placeholder={t("auth.loginPasswordPlaceholder")}
            value={password}
            error={fieldErrors.password}
            showPasswordToggle
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            labelExtra={
              <Link href="/forgot-password" className="text-[12px] font-medium text-accent hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            }
            required
          />
          {error && <p className="auth-banner-error" role="alert">{error}</p>}
          <div className="pt-2">
            <Button type="submit" className="auth-submit-modern" disabled={loading}>
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="auth-form space-y-4">
          <p className="text-[14px] text-muted-foreground">{t("auth.chooseWorkspace")}</p>
          <ul className="space-y-2">
            {organizations.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  className="auth-workspace-btn flex w-full items-center gap-3 rounded-xl bg-[#f4f6fa] px-4 py-3.5 text-left ring-1 ring-[#e2e8f0] transition-all hover:bg-white hover:ring-accent/25 disabled:opacity-60"
                  disabled={loading}
                  onClick={() => void submitLogin(org.id)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="text-[14px] font-semibold text-foreground">{org.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOrganizations(null)}>
            {t("auth.back")}
          </Button>
        </div>
      )}

      <p className="mt-5 text-center text-[12px] text-muted-foreground">
        {t("auth.tryDemo")}{" "}
        <Link href="/demo" className="font-semibold text-accent hover:underline">
          {t("auth.tryDemoLink")}
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href={registerHref} className="font-semibold text-accent hover:underline">
          {CTA.createWorkspace}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  const { t } = useAuthI18n();

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#fafbfc]">
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
