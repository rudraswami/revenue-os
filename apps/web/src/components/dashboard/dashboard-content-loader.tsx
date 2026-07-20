"use client";

import { GrowvisiLogoLoader } from "@/components/ui/loading";

/**
 * In-content loading state for the dashboard.
 *
 * Unlike the full-screen `LoadingScreen`, this keeps the persistent shell
 * (sidebar + chrome) visible and only fills the main content area — so the
 * app never appears to fully reload during auth restore or onboarding checks.
 */
export function DashboardContentLoader({ message }: { message?: string }) {
  return (
    <div
      className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4 px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <GrowvisiLogoLoader size="md" />
      {message ? (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
