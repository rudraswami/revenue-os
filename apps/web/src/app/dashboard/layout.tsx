import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGate } from "@/components/auth/onboarding-gate";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OnboardingGate>
        <div className="flex min-h-screen app-shell">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </OnboardingGate>
    </AuthGuard>
  );
}
