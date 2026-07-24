import { RequireDashboardAccess } from "@/components/auth/require-dashboard-access";

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <RequireDashboardAccess route="templates">{children}</RequireDashboardAccess>;
}
