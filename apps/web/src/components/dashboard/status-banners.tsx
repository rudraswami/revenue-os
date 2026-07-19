"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { shouldShowWhatsappConnectBanner } from "@/lib/whatsapp-connection-state";
import { useAuthStore } from "@/stores/auth-store";

interface BillingEntitlements {
  entitlements?: {
    trialExpired: boolean;
    trialEndsAt: string | null;
    hasAccess: boolean;
    requiresUpgrade: boolean;
    planId: string;
  };
}

export function TrialExpiredBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiFetch<BillingEntitlements>("/billing", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const access = data?.entitlements;
  if (!access || access.hasAccess) return null;

  const trialEnded = access.trialExpired;
  const trialEndsSoon =
    !trialEnded &&
    access.trialEndsAt &&
    new Date(access.trialEndsAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  if (!trialEnded && !trialEndsSoon) return null;

  return (
    <div
      className={`mx-4 mb-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 lg:mx-8 lg:mt-6 ${
        trialEnded
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-amber-200/80 bg-amber-50/90 text-amber-950"
      }`}
    >
      <div className="flex items-start gap-3">
        {trialEnded ? (
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {trialEnded ? "Your 14-day trial has ended" : "Trial ending soon"}
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            {trialEnded
              ? "Upgrade to keep classifying leads, connecting WhatsApp, and inviting your team."
              : `Trial ends ${new Date(access.trialEndsAt!).toLocaleDateString()} — pick a plan to avoid interruption.`}
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/pricing"
        className={`inline-flex shrink-0 items-center rounded-xl px-4 py-2 text-xs font-semibold ${
          trialEnded
            ? "bg-destructive text-white hover:bg-destructive/90"
            : "bg-amber-700 text-white hover:bg-amber-800"
        }`}
      >
        View plans
      </Link>
    </div>
  );
}

export function AiCapabilitiesBanner() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: capabilities } = useQuery({
    queryKey: ["conversation-capabilities"],
    queryFn: () =>
      apiFetch<{ aiClassification: boolean; aiSuggestReply: boolean }>(
        "/conversations/capabilities",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: 300_000,
  });

  if (!capabilities || capabilities.aiClassification) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
      <div className="flex-1">
        <p className="font-semibold">AI classification is being set up</p>
        <p className="mt-1 text-sm text-amber-900/85">
          Classification starts automatically once your workspace is configured. Use the help button
          (bottom-right) or email it@growvisi.com if this persists after WhatsApp is connected.
        </p>
      </div>
    </div>
  );
}

/** One-time style notice for legacy Viewer seats — read-only, no new invites. */
export function LegacyViewerBanner() {
  const role = useAuthStore((s) => s.role);
  if (role !== "VIEWER") return null;

  return (
    <div className="border-b border-blue-200/80 bg-blue-50/90 px-4 py-2.5 text-sm text-blue-950">
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden />
        <p className="min-w-0 flex-1 leading-snug">
          You have <strong>Viewer</strong> access (read-only). Ask an admin to upgrade you to{" "}
          <strong>Team</strong> if you need to reply in Inbox or update deals.
        </p>
      </div>
    </div>
  );
}

export function OnboardingBanner() {
  const token = useAuthStore((s) => s.accessToken);
  const persistedWhatsappConnected = useAuthStore((s) => s.onboarding?.whatsappConnected);

  const { data: agencyStatus } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () => apiFetch<{ isAgency: boolean }>("/agency/status", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token && !agencyStatus?.isAgency,
  });

  const showBanner = shouldShowWhatsappConnectBanner({
    hasToken: !!token,
    isAgency: !!agencyStatus?.isAgency,
    accounts,
    persistedWhatsappConnected,
  });
  if (!showBanner) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/25 bg-bento-mint/50 px-4 py-3 lg:mb-6">
      <div>
        <p className="text-sm font-semibold text-foreground">Connect WhatsApp to start capturing revenue</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Continue with Meta (Embedded Signup) — we link your business number and ingest customer messages.
        </p>
      </div>
      <Link
        href="/onboarding"
        className="inline-flex shrink-0 items-center rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent-hover"
      >
        Connect now
      </Link>
    </div>
  );
}
