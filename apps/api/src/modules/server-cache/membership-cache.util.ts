import type { MembershipRole } from "@growvisi/shared";

const MEMBERSHIP_ROLES = new Set<MembershipRole>([
  "OWNER",
  "ADMIN",
  "MANAGER",
  "AGENT",
  "VIEWER",
]);

export function isMembershipRole(value: unknown): value is MembershipRole {
  return typeof value === "string" && MEMBERSHIP_ROLES.has(value as MembershipRole);
}

export function isCachedMembership(value: unknown): value is { role: string; userStatus: string } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.role === "string" && typeof v.userStatus === "string";
}
