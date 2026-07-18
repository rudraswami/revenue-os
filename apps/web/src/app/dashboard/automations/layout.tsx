import { RequireDashboardAccess } from "@/components/auth/require-dashboard-access";

export default function AutomationsLayout({ children }: { children: React.ReactNode }) {
  return <RequireDashboardAccess route="automations">{children}</RequireDashboardAccess>;
}
