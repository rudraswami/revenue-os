import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGate } from "@/components/auth/onboarding-gate";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LocaleProvider } from "@/lib/i18n/locale-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OnboardingGate>
        <LocaleProvider>
          <DashboardShell>{children}</DashboardShell>
        </LocaleProvider>
      </OnboardingGate>
    </AuthGuard>
  );
}
