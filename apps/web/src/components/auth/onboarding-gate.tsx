"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEmailVerified } from "@/hooks/use-email-verified";
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
  const onboarding = useAuthStore((s) => s.onboarding);
  const onboardingDismissed = useAuthStore((s) => s.onboardingDismissed);
  const hydrated = useAuthStore((s) => s.hydrated);
  const verified = useEmailVerified();
  const [checked, setChecked] = useState(false);

  const onVerifyFlow = pathname.startsWith("/verify-email");
  const shouldRedirectToVerify = hydrated && !verified && !onVerifyFlow;

  const shouldRedirectToOnboarding =
    hydrated &&
    verified &&
    !!onboarding &&
    !onboarding.whatsappConnected &&
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

  if (!hydrated || pending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
