"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, Mail } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { applySession, postAuthPath } from "@/lib/auth-session";
import { CTA } from "@/lib/brand-copy";
import type { AuthSession, LoginResult, OrganizationOption } from "@/lib/auth-types";
import { isAuthSession } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n/locale-provider";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
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
      router.push(safeNext ?? postAuthPath(res.onboarding));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth.signInFailed"));
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
    <AuthShell title={t("auth.loginTitle")} description={t("auth.loginSubtitle")}>
      {resetDone && (
        <p className="mb-5 rounded-xl border border-success/30 bg-[#ecfdf5] px-3.5 py-2.5 text-sm text-success">
          {t("auth.passwordUpdated")}
        </p>
      )}
      {deletedDone && (
        <p className="mb-5 rounded-xl border border-success/30 bg-[#ecfdf5] px-3.5 py-2.5 text-sm text-success">
          {t("auth.accountDeleted")}
        </p>
      )}
      {!organizations ? (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <AuthField
            id="email"
            name="email"
            label={t("auth.email")}
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@company.com"
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
            icon={Lock}
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            error={fieldErrors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            labelExtra={
              <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            }
            required
          />
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="accent" className="auth-submit" disabled={loading}>
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("auth.chooseWorkspace")}</p>
          <ul className="space-y-2">
            {organizations.map((org) => (
              <li key={org.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start rounded-xl border-[#dce9ff] py-3.5 hover:border-accent/30 hover:bg-[#ecfdf5]/50"
                  disabled={loading}
                  onClick={() => void submitLogin(org.id)}
                >
                  <Building2 className="mr-2 h-4 w-4 text-accent" />
                  <span className="font-medium">{org.name}</span>
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOrganizations(null)}>
            {t("auth.back")}
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          {CTA.createWorkspace}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f8f9ff]">
          <div className="rounded-2xl border border-[#dce9ff] bg-white px-8 py-6 text-sm text-muted-foreground shadow-sm">
            {t("auth.loading")}
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
