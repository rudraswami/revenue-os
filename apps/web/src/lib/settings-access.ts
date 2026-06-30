import type { GrowvisiPlanId, MembershipRole } from "@growvisi/shared";
import { canManageCampaigns, canManageTeam } from "@/lib/permissions";

export type SettingsTabId =
  | "team"
  | "whatsapp"
  | "billing"
  | "intelligence"
  | "growth"
  | "developers"
  | "account";

/** @deprecated Workspace tab merged into Team — kept for URL redirects */
export type LegacySettingsTabId = SettingsTabId | "workspace";

export const SETTINGS_TAB_ORDER: SettingsTabId[] = [
  "whatsapp",
  "billing",
  "account",
  "team",
  "intelligence",
  "growth",
  "developers",
];

export const SETTINGS_ESSENTIAL_TABS: SettingsTabId[] = [
  "whatsapp",
  "billing",
  "account",
  "team",
];

export const SETTINGS_ADVANCED_TABS: SettingsTabId[] = [
  "intelligence",
  "growth",
  "developers",
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
  return visible[0] ?? "account";
}

export function normalizeSettingsTab(raw: string | null): SettingsTabId | null {
  if (!raw || raw === "workspace") return raw === "workspace" ? "team" : null;
  return SETTINGS_TAB_ORDER.includes(raw as SettingsTabId) ? (raw as SettingsTabId) : null;
}

export function parseSettingsTab(raw: string | null): SettingsTabId | null {
  return normalizeSettingsTab(raw);
}

export const SETTINGS_HASH_TO_TAB: Record<string, SettingsTabId> = {
  workspace: "team",
  team: "team",
  whatsapp: "whatsapp",
  billing: "billing",
  developers: "developers",
  developer: "developers",
  growth: "growth",
  intelligence: "intelligence",
  account: "account",
};
