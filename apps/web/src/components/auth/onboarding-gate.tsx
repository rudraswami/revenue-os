"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const hydrated = useAuthStore((s) => s.hydrated);
  const [checked, setChecked] = useState(false);

  const shouldRedirect =
    hydrated &&
    !!onboarding &&
    !onboarding.whatsappConnected &&
    !onboardingDismissed &&
    !SKIP_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!hydrated) return;
    if (shouldRedirect) {
      router.replace("/onboarding");
      return;
    }
    setChecked(true);
  }, [hydrated, shouldRedirect, router]);

  if (!hydrated || (shouldRedirect && !checked)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
