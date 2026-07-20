"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { canAccessDashboardRoute, type DashboardRoute } from "@/lib/route-access";
import { useAuthStore } from "@/stores/auth-store";

export function RequireDashboardAccess({
  route,
  children,
}: {
  route: DashboardRoute;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const hydrated = useAuthStore((s) => s.hydrated);
  const allowed = canAccessDashboardRoute(route, role);

  useEffect(() => {
    if (hydrated && role && !allowed) {
      router.replace("/dashboard");
    }
  }, [hydrated, role, allowed, router]);

  if (!hydrated || !role) return null;

  if (!allowed) {
    return (
      <div className="dashboard-page px-4 py-12 lg:px-8">
        <EmptyState
          icon={<Lock className="h-6 w-6" />}
          title="You don't have access to this page"
          description="Analytics is available to workspace owners, admins, managers, and team members. Viewer accounts cannot open this page — ask a workspace admin if you need access."
          actionHref="/dashboard"
          actionLabel="Back to home"
        />
      </div>
    );
  }

  return <>{children}</>;
}
