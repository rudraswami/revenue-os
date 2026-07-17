"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, Mail, User } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { applySession, postAuthPath } from "@/lib/auth-session";
import { CTA } from "@/lib/brand-copy";
import type { AuthSession } from "@/lib/auth-types";
import { useI18n } from "@/lib/i18n/locale-provider";

function passwordStrength(
  password: string,
  t: (key: string) => string,
): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "", width: "0%" };
  if (password.length < 8) {
    return { label: t("auth.passwordStrength.tooShort"), color: "bg-warning", width: "33%" };
  }
  if (password.length < 12) {
    return { label: t("auth.passwordStrength.good"), color: "bg-accent", width: "66%" };
  }
  return { label: t("auth.passwordStrength.strong"), color: "bg-accent", width: "100%" };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const inviteToken = searchParams.get("invite") ?? "";
  const inviteEmail = searchParams.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(inviteEmail);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    organizationName?: string;
  }>({});
  const strength = passwordStrength(password, t);
  const isInvite = inviteToken.length > 0;

  const { data: invitePreview } = useQuery({
    queryKey: ["invite-preview", inviteToken],
    queryFn: () =>
      apiFetch<{ organizationName: string; email: string; role: string }>(
        `/organizations/invites/preview?token=${encodeURIComponent(inviteToken)}`,
      ),
    enabled: isInvite,
    retry: false,
  });

  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail);
  }, [inviteEmail]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (!name.trim()) nextErrors.name = t("auth.nameRequired");
    if (!email.trim()) nextErrors.email = t("auth.emailRequired");
    if (!password) nextErrors.password = t("auth.passwordRequired");
    else if (password.length < 8) nextErrors.password = t("auth.passwordTooShort");
    if (!isInvite && !companyName.trim()) nextErrors.organizationName = t("auth.companyRequired");
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        email: email.trim(),
        password,
      };
      if (isInvite) {
        body.inviteToken = inviteToken;
      } else {
        body.organizationName = companyName.trim();
      }

      const res = await apiFetch<AuthSession>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      applySession(res);
      router.push(postAuthPath(res.onboarding));
    } catch (err) {
      setError(toUserMessage(err, t("auth.registerFailed")));
    } finally {
      setLoading(false);
    }
  }

  const orgName = invitePreview?.organizationName ?? "your team";

  return (
    <AuthShell
      badge={isInvite ? t("auth.teamInvite") : t("auth.freeTrial")}
      title={
        isInvite
          ? t("auth.joinTeamTitle").replace("{org}", orgName)
          : t("auth.createWorkspaceTitle")
      }
      description={isInvite ? t("auth.joinTeamSubtitle") : t("auth.createWorkspaceSubtitle")}
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {!isInvite && (
          <AuthField
            id="organizationName"
            name="organizationName"
            label={t("auth.companyName")}
            icon={Building2}
            placeholder="Acme Retail"
            autoComplete="organization"
            value={companyName}
            error={fieldErrors.organizationName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              if (fieldErrors.organizationName) {
                setFieldErrors((p) => ({ ...p, organizationName: undefined }));
              }
            }}
            required
          />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField
            id="name"
            name="name"
            label={t("auth.name")}
            icon={User}
            placeholder="Jane Smith"
            autoComplete="name"
            value={name}
            error={fieldErrors.name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
            }}
            required
          />
          <AuthField
            id="email"
            name="email"
            label={t("auth.email")}
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            error={fieldErrors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            readOnly={!!inviteEmail}
            required
          />
        </div>
        <div>
          <AuthField
            id="password"
            name="password"
            label={t("auth.password")}
            type="password"
            icon={Lock}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            value={password}
            error={fieldErrors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            required
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="h-1 overflow-hidden rounded-full bg-[#dce9ff]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{strength.label}</p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="auth-submit" disabled={loading}>
          {loading
            ? isInvite
              ? t("auth.joinTeam")
              : t("auth.createWorkspace")
            : isInvite
              ? t("auth.acceptInvite")
              : CTA.startTrial}
        </Button>
      </form>

      {!isInvite && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-muted-foreground">
          <span>{t("auth.noCard")}</span>
          <span className="hidden sm:inline">·</span>
          <span>{t("auth.razorpayNote")}</span>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f8f9ff]">
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
