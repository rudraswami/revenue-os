import type { MembershipRole } from "@growvisi/shared";

const WRITE_ROLES: MembershipRole[] = ["OWNER", "ADMIN", "MANAGER", "AGENT"];
const MANAGE_ROLES: MembershipRole[] = ["OWNER", "ADMIN", "MANAGER"];
const ADMIN_ROLES: MembershipRole[] = ["OWNER", "ADMIN"];

export function canWrite(role: MembershipRole | null | undefined): boolean {
  return !!role && WRITE_ROLES.includes(role);
}

export function canManageTeam(role: MembershipRole | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

export function canManageCampaigns(role: MembershipRole | null | undefined): boolean {
  return !!role && MANAGE_ROLES.includes(role);
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENT: "Agent",
  VIEWER: "Viewer",
};

export const INVITE_ROLES: MembershipRole[] = ["ADMIN", "MANAGER", "AGENT", "VIEWER"];
