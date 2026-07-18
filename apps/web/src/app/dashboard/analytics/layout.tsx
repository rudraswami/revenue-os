import { RequireDashboardAccess } from "@/components/auth/require-dashboard-access";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <RequireDashboardAccess route="analytics">{children}</RequireDashboardAccess>;
}
