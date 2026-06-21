"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

const SKIP_PREFIXES = [
  "/onboarding",
  "/dashboard/settings",
  "/dashboard/pricing",
];

/** Soft gate: new workspaces without WhatsApp land on onboarding first. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const onboarding = useAuthStore((s) => s.onboarding);
  const onboardingDismissed = useAuthStore((s) => s.onboardingDismissed);

  useEffect(() => {
    if (!onboarding || onboarding.whatsappConnected || onboardingDismissed) return;
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;
    router.replace("/onboarding");
  }, [onboarding, onboardingDismissed, pathname, router]);

  return <>{children}</>;
}
