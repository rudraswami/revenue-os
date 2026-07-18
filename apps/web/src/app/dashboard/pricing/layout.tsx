import { RequireDashboardAccess } from "@/components/auth/require-dashboard-access";

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <RequireDashboardAccess route="pricing">{children}</RequireDashboardAccess>;
}
