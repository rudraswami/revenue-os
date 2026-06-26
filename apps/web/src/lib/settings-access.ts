import type { GrowvisiPlanId, MembershipRole } from "@growvisi/shared";
import { canManageCampaigns, canManageTeam } from "@/lib/permissions";

export type SettingsTabId =
  | "workspace"
  | "team"
  | "whatsapp"
  | "billing"
  | "intelligence"
  | "growth"
  | "developers"
  | "account";

export const SETTINGS_TAB_ORDER: SettingsTabId[] = [
  "workspace",
  "team",
  "whatsapp",
  "billing",
  "intelligence",
  "growth",
  "developers",
  "account",
];

const PLAN_RANK: Record<GrowvisiPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

export interface SettingsAccessContext {
  role: MembershipRole | null | undefined;
  planId: string;
}

export function planAtLeast(planId: string, minimum: "growth" | "pro"): boolean {
  const rank = PLAN_RANK[planId in PLAN_RANK ? (planId as GrowvisiPlanId) : "trial"];
  return rank >= (minimum === "growth" ? 2 : 3);
}

function hasBillingRole(role: MembershipRole | null | undefined): boolean {
  return !!role && (role === "OWNER" || role === "ADMIN");
}

function hasWhatsappRole(role: MembershipRole | null | undefined): boolean {
  return !!role && role !== "VIEWER";
}

function hasDevelopersRole(role: MembershipRole | null | undefined): boolean {
  return canManageTeam(role);
}

function hasGrowthRole(role: MembershipRole | null | undefined): boolean {
  return canManageCampaigns(role);
}

function hasIntelligenceRole(role: MembershipRole | null | undefined): boolean {
  return canManageCampaigns(role);
}

/** Role gate only — tab may still require a higher plan. */
export function canAccessSettingsTabRole(
  tab: SettingsTabId,
  role: MembershipRole | null | undefined,
): boolean {
  switch (tab) {
    case "workspace":
    case "team":
    case "account":
      return !!role;
    case "whatsapp":
      return hasWhatsappRole(role);
    case "billing":
      return hasBillingRole(role);
    case "intelligence":
      return hasIntelligenceRole(role);
    case "growth":
      return hasGrowthRole(role);
    case "developers":
      return hasDevelopersRole(role);
    default:
      return false;
  }
}

export function settingsTabPlanRequirement(
  tab: SettingsTabId,
): "growth" | "pro" | null {
  if (tab === "growth") return "growth";
  if (tab === "developers") return "pro";
  return null;
}

/** Full access: correct role and plan (when applicable). */
export function canAccessSettingsTab(
  tab: SettingsTabId,
  ctx: SettingsAccessContext,
): boolean {
  if (!canAccessSettingsTabRole(tab, ctx.role)) return false;
  const planReq = settingsTabPlanRequirement(tab);
  if (planReq && !planAtLeast(ctx.planId, planReq)) return false;
  return true;
}

export function getVisibleSettingsTabs(ctx: SettingsAccessContext): SettingsTabId[] {
  return SETTINGS_TAB_ORDER.filter((tab) => canAccessSettingsTab(tab, ctx));
}

export function getDefaultSettingsTab(ctx: SettingsAccessContext): SettingsTabId {
  const visible = getVisibleSettingsTabs(ctx);
  if (visible.includes("workspace")) return "workspace";
  return visible[0] ?? "account";
}

export function parseSettingsTab(raw: string | null): SettingsTabId | null {
  if (!raw) return null;
  return SETTINGS_TAB_ORDER.includes(raw as SettingsTabId) ? (raw as SettingsTabId) : null;
}

export const SETTINGS_HASH_TO_TAB: Record<string, SettingsTabId> = {
  whatsapp: "whatsapp",
  billing: "billing",
  team: "team",
  developers: "developers",
  developer: "developers",
  growth: "growth",
  intelligence: "intelligence",
};
