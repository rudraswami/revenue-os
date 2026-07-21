"use client";

import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { shouldShowWhatsappConnectBanner } from "@/lib/whatsapp-connection-state";
import { useAuthStore } from "@/stores/auth-store";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import {
  useShellAgencyStatus,
  useShellConversationCapabilities,
  useShellWhatsappAccounts,
} from "@/hooks/use-shell-data";

interface BillingEntitlements {
  status?: string;
  entitlements?: {
    trialExpired: boolean;
    trialEndsAt: string | null;
    hasAccess: boolean;
    requiresUpgrade: boolean;
    planId: string;
    status?: string;
  };
}

export function TrialExpiredBanner() {
  const { data } = useShellBilling<BillingEntitlements>();

  const access = data?.entitlements;
  const subscriptionStatus = data?.status ?? access?.status;
  const pastDue = subscriptionStatus === "PAST_DUE";

  if (pastDue) {
    return (
      <div className="mx-4 mb-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive lg:mx-8 lg:mt-6">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Payment failed — access paused</p>
            <p className="mt-0.5 text-xs opacity-90">
              Update your Razorpay payment method in Settings to restore Inbox, Pipeline, and
              campaigns.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings?tab=billing"
          className="inline-flex shrink-0 items-center rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white hover:bg-destructive/90"
        >
          Fix billing
        </Link>
      </div>
    );
  }

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
          : "border-warning/30 bg-warning/10 text-warning"
      }`}
    >
      <div className="flex items-start gap-3">
        {trialEnded ? (
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
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
            : "bg-warning text-white hover:bg-warning"
        }`}
      >
        View plans
      </Link>
    </div>
  );
}

export function AiCapabilitiesBanner() {
  const { data: capabilities } = useShellConversationCapabilities();

  if (!capabilities || capabilities.aiClassification) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div className="flex-1">
        <p className="font-semibold">AI classification is being set up</p>
        <p className="mt-1 text-sm text-warning">
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
    <div className="border-b border-info/30 bg-info/10 px-4 py-2.5 text-sm text-info">
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
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

  const { data: agencyStatus } = useShellAgencyStatus();
  const { data: accounts } = useShellWhatsappAccounts();

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
