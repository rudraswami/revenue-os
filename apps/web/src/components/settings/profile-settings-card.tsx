"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { applySession } from "@/lib/auth-session";
import type { MeResponse } from "@/lib/auth-types";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole } from "@growvisi/shared";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/messages";
import { Select } from "@/components/ui/select";

export function ProfileSettingsCard() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const organization = useAuthStore((s) => s.organization);
  const { t } = useI18n();
  const [name, setName] = useState(user?.name ?? "");
  const [locale, setLocale] = useState<Locale>((user?.locale as Locale) ?? "en");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<MeResponse>("/auth/me", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ name: name.trim(), locale }),
      }),
    onSuccess: (me) => {
      const current = useAuthStore.getState();
      applySession({
        accessToken: current.accessToken!,
        refreshToken: current.refreshToken!,
        user: me.user,
        organization: me.organization,
        role: me.role,
        onboarding: me.onboarding,
      });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not update profile.");
    },
  });

  const dirty =
    name.trim() !== (user?.name ?? "").trim() ||
    locale !== ((user?.locale as Locale) ?? "en");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center">
        <AvatarInitials name={name || user?.email || "?"} size="lg" className="!h-16 !w-16 text-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold tracking-tight">{name || user?.name || "Your account"}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{user?.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {role && (
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                {ROLE_LABELS[role as MembershipRole]}
              </span>
            )}
            {organization?.name && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {organization.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="profile-name">
            Display name
          </label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-xl"
            placeholder="Your name"
          />
          <p className="text-xs text-muted-foreground">
            Shown in the sidebar, assignments, and activity feed.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="profile-locale">
            {t("common.language")}
          </label>
          <Select
            id="profile-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-10 rounded-xl text-sm"
          >
            <option value="en">{t("common.english")}</option>
            <option value="hi">{t("common.hindi")}</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Dashboard navigation and key labels. Full Hindi coverage expands over time.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email
          </label>
          <Input value={user?.email ?? ""} readOnly disabled className="h-10 rounded-xl bg-muted/40" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </label>
          <Input
            value={organization?.name ?? ""}
            readOnly
            disabled
            className="h-10 rounded-xl bg-muted/40"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-accent">
          <Check className="h-4 w-4" />
          Profile saved
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="accent"
          className="rounded-xl"
          disabled={!name.trim() || !dirty || mutation.isPending || !token}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        {dirty && !mutation.isPending && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-xl text-muted-foreground"
            onClick={() => setName(user?.name ?? "")}
          >
            Discard
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Password changes are not available in-app yet.{" "}
        <Link href="/forgot-password" className="font-medium text-accent underline">
          Reset via email
        </Link>
      </p>
    </div>
  );
}
