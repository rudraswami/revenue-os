import { RequireDashboardAccess } from "@/components/auth/require-dashboard-access";

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return <RequireDashboardAccess route="ai">{children}</RequireDashboardAccess>;
}
