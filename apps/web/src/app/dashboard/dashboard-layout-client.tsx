"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGate } from "@/components/auth/onboarding-gate";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ShellBootstrapInitialProvider } from "@/components/dashboard/shell-bootstrap-initial";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import type { ShellBootstrapResponse } from "@/lib/shell-bootstrap";

export function DashboardLayoutClient({
  initialShell,
  children,
}: {
  initialShell: ShellBootstrapResponse | null;
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <LocaleProvider>
        <ShellBootstrapInitialProvider initial={initialShell}>
          <DashboardShell>
            <OnboardingGate>{children}</OnboardingGate>
          </DashboardShell>
        </ShellBootstrapInitialProvider>
      </LocaleProvider>
    </AuthGuard>
  );
}
