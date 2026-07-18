"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { Button } from "@/components/ui/button";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { withAuthQuery } from "@/lib/auth-links";
import { applySession, postAuthRedirect } from "@/lib/auth-session";
import type { AuthSession } from "@/lib/auth-types";

function passwordStrength(
  password: string,
  t: (key: string) => string,
): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "", width: "0%" };
  if (password.length < 8) {
    return { label: t("auth.passwordStrength.tooShort"), color: "bg-amber-400", width: "33%" };
  }
  if (password.length < 12) {
    return { label: t("auth.passwordStrength.good"), color: "bg-accent", width: "66%" };
  }
  return { label: t("auth.passwordStrength.strong"), color: "bg-accent", width: "100%" };
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAuthI18n();
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
  const loginHref = withAuthQuery("/login", searchParams);

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
      router.push(postAuthRedirect(res, isInvite));
    } catch (err) {
      setError(toUserMessage(err, t("auth.registerFailed")));
    } finally {
      setLoading(false);
    }
  }

  const orgName = invitePreview?.organizationName ?? "your team";

  return (
    <AuthShell
      badge={isInvite ? t("auth.teamInvite") : undefined}
      title={
        isInvite ? t("auth.joinTeamTitle").replace("{org}", orgName) : t("auth.createWorkspaceTitle")
      }
      description={isInvite ? t("auth.joinTeamSubtitle") : t("auth.createWorkspaceSubtitle")}
      showMobileHero={!isInvite}
    >
      <form onSubmit={onSubmit} className="auth-form space-y-4" noValidate>
        {!isInvite && (
          <AuthField
            id="organizationName"
            name="organizationName"
            label={t("auth.companyName")}
            variant="modern"
            placeholder={t("auth.companyPlaceholder")}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            id="name"
            name="name"
            label={t("auth.name")}
            variant="modern"
            placeholder={t("auth.namePlaceholder")}
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
            variant="modern"
            placeholder={t("auth.emailPlaceholder")}
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
            variant="modern"
            placeholder={t("auth.passwordPlaceholder")}
            autoComplete="new-password"
            minLength={8}
            value={password}
            error={fieldErrors.password}
            showPasswordToggle
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            required
          />
          {password.length > 0 && (
            <div className="mt-2.5 px-0.5">
              <div className="h-[3px] overflow-hidden rounded-full bg-[#e8ecf2]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              {strength.label ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">{strength.label}</p>
              ) : null}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="auth-banner-error">
            {error}
          </p>
        )}

        <div className="space-y-3 pt-2">
          <Button type="submit" className="auth-submit-modern" disabled={loading}>
            {loading
              ? isInvite
                ? t("auth.joinTeam")
                : t("auth.createWorkspace")
              : isInvite
                ? t("auth.acceptInvite")
                : t("auth.createWorkspaceCta")}
          </Button>

          {!isInvite && (
            <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
              {t("auth.registerInclusions")}
              <span className="mx-1.5 text-border">·</span>
              {t("auth.razorpayNote")}
            </p>
          )}
        </div>
      </form>

      {!isInvite && (
        <p className="mt-5 text-center text-[12px] leading-relaxed text-muted-foreground/90">
          {t("auth.humanReplyNote")}
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.hasAccount")}{" "}
        <Link href={loginHref} className="font-semibold text-accent hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  const { t } = useAuthI18n();

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#fafbfc]">
          <p className="text-sm text-muted-foreground">{t("auth.loading")}</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
