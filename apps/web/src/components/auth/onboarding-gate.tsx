"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

/** Sends new users to /onboarding until WhatsApp is connected. */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((s) => s.accessToken);
  const onboarding = useAuthStore((s) => s.onboarding);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 10_000,
  });

  const whatsappConnected = accounts?.some((a) => a.isActive) ?? false;

  useEffect(() => {
    if (whatsappConnected) {
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived: onboarding?.firstMessageReceived ?? false,
        complete: true,
      });
    }
  }, [whatsappConnected, onboarding?.firstMessageReceived, patchOnboarding]);

  useEffect(() => {
    if (!token) return;
    const complete = whatsappConnected || onboarding?.complete;
    if (!complete && pathname.startsWith("/dashboard")) {
      router.replace("/onboarding");
    }
  }, [token, whatsappConnected, onboarding, pathname, router]);

  return <>{children}</>;
}
