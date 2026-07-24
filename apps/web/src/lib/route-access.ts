import type { MembershipRole } from "@growvisi/shared";
import { hasCapability } from "@growvisi/shared";

export type DashboardRoute =
  | "analytics"
  | "automations"
  | "campaigns"
  | "templates"
  | "pricing";

const ROUTE_CAPABILITIES: Record<DashboardRoute, import("@growvisi/shared").Capability | import("@growvisi/shared").Capability[]> = {
  analytics: "analytics.view.team",
  automations: "automations.manage",
  campaigns: "campaigns.manage",
  templates: "campaigns.manage",
  pricing: "billing.view",
};

export function canAccessDashboardRoute(
  route: DashboardRoute,
  role: MembershipRole | null | undefined,
): boolean {
  if (!role) return false;
  const caps = ROUTE_CAPABILITIES[route];
  if (Array.isArray(caps)) return caps.some((c) => hasCapability(role, c));
  return hasCapability(role, caps);
}
