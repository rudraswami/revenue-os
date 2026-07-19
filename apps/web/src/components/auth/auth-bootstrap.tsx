"use client";

import { useEffect } from "react";
import { GrowvisiLogoLoader } from "@/components/ui/loading";
import { useCrossTabLogoutSync } from "@/hooks/use-cross-tab-logout-sync";
import { hasSessionHint } from "@/lib/auth-cookie";
import { shouldRunBootstrapOnHydrate } from "@/lib/auth-bootstrap-policy";
import { startBootstrapAuth } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Rehydrates persisted auth, then refreshes tokens in the background.
 * Never blocks the app on bootstrap — dashboard shell renders from cache immediately.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  useCrossTabLogoutSync();

  useEffect(() => {
    if (!hydrated) return;

    const state = useAuthStore.getState();
    if (
      !shouldRunBootstrapOnHydrate({
        refreshToken: state.refreshToken,
        accessToken: state.accessToken,
        hasSessionHint: hasSessionHint(),
      })
    ) {
      return;
    }

    void startBootstrapAuth();
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center surface-lavender" aria-busy="true">
        <GrowvisiLogoLoader size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
