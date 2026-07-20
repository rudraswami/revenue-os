"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEmailVerified } from "@/hooks/use-email-verified";
import { DashboardContentLoader } from "@/components/dashboard/dashboard-content-loader";
import { useAuthStore } from "@/stores/auth-store";

const SKIP_PREFIXES = [
  "/onboarding",
  "/dashboard/settings",
  "/dashboard/pricing",
  "/dashboard/agency",
  "/dashboard/partner",
  "/dashboard/connection",
  "/verify-email",
];

/** Soft gate: verify email first, then WhatsApp onboarding for new workspaces. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Narrow to the derived boolean so unrelated onboarding fields changing
  // don't rerender the whole content area.
  const onboardingNeedsWhatsapp = useAuthStore(
    (s) => s.onboarding != null && !s.onboarding.whatsappConnected,
  );
  const onboardingDismissed = useAuthStore((s) => s.onboardingDismissed);
  const hydrated = useAuthStore((s) => s.hydrated);
  const verified = useEmailVerified();
  const [checked, setChecked] = useState(false);

  const onVerifyFlow = pathname.startsWith("/verify-email");
  const shouldRedirectToVerify = hydrated && !verified && !onVerifyFlow;

  const shouldRedirectToOnboarding =
    hydrated &&
    verified &&
    onboardingNeedsWhatsapp &&
    !onboardingDismissed &&
    !SKIP_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!hydrated) return;
    if (shouldRedirectToVerify) {
      router.replace("/verify-email/check");
      return;
    }
    if (shouldRedirectToOnboarding) {
      router.replace("/onboarding");
      return;
    }
    setChecked(true);
  }, [hydrated, shouldRedirectToVerify, shouldRedirectToOnboarding, router]);

  const pending = shouldRedirectToVerify || (shouldRedirectToOnboarding && !checked);

  // Keep the persistent shell mounted — only the content area shows the loader.
  if (!hydrated || pending) {
    return <DashboardContentLoader />;
  }

  return <>{children}</>;
}
