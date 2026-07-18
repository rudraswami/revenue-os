import { RequireDashboardAccess } from "@/components/auth/require-dashboard-access";

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <RequireDashboardAccess route="campaigns">{children}</RequireDashboardAccess>;
}
