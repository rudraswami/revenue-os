import type { GrowvisiPlanId, MembershipRole } from "@growvisi/shared";
import { hasCapability } from "@growvisi/shared";

export type SettingsTabId =
  | "workspace"
  | "people"
  | "whatsapp"
  | "billing"
  | "intelligence"
  | "growth"
  | "developers"
  | "account";

/** @deprecated Aliases kept for URL redirects */
export type LegacySettingsTabId = SettingsTabId | "team" | "workspace-legacy";

/** Canonical nav order — workspace is the default landing. */
export const SETTINGS_TAB_ORDER: SettingsTabId[] = [
  "workspace",
  "people",
  "whatsapp",
  "billing",
  "intelligence",
  "growth",
  "developers",
  "account",
];

export type SettingsNavGroupId = "workspace" | "organization" | "channels" | "platform" | "personal";

export const SETTINGS_NAV_GROUPS: Array<{
  id: SettingsNavGroupId;
  tabIds: SettingsTabId[];
}> = [
  { id: "workspace", tabIds: ["workspace"] },
  { id: "organization", tabIds: ["people", "billing"] },
  { id: "channels", tabIds: ["whatsapp"] },
  { id: "platform", tabIds: ["intelligence", "growth", "developers"] },
  { id: "personal", tabIds: ["account"] },
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

/** Role gate — controls nav visibility (stable; does not depend on billing). */
export function canAccessSettingsTabRole(
  tab: SettingsTabId,
  role: MembershipRole | null | undefined,
): boolean {
  if (!role) return false;
  switch (tab) {
    case "workspace":
    case "people":
    case "account":
      return hasCapability(role, "team.view");
    case "whatsapp":
      return role !== "VIEWER";
    case "billing":
      return hasCapability(role, "billing.view");
    case "intelligence":
      return hasCapability(role, "knowledge.manage") || hasCapability(role, "templates.manage");
    case "growth":
      return hasCapability(role, "campaigns.manage");
    case "developers":
      return hasCapability(role, "developers.keys");
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

/** Nav items — role only so billing load does not shift the sidebar. */
export function getVisibleSettingsTabs(ctx: SettingsAccessContext): SettingsTabId[] {
  return SETTINGS_TAB_ORDER.filter((tab) => canAccessSettingsTabRole(tab, ctx.role));
}

export function getDefaultSettingsTab(ctx: SettingsAccessContext): SettingsTabId {
  const visible = getVisibleSettingsTabs(ctx);
  return visible.includes("workspace") ? "workspace" : (visible[0] ?? "account");
}

function legacyTabToId(raw: string): SettingsTabId | null {
  if (raw === "team") return "people";
  return null;
}

export function normalizeSettingsTab(raw: string | null): SettingsTabId | null {
  if (!raw) return null;
  const legacy = legacyTabToId(raw);
  if (legacy) return legacy;
  return SETTINGS_TAB_ORDER.includes(raw as SettingsTabId) ? (raw as SettingsTabId) : null;
}

export function parseSettingsTab(raw: string | null): SettingsTabId | null {
  return normalizeSettingsTab(raw);
}

export const SETTINGS_HASH_TO_TAB: Record<string, SettingsTabId> = {
  workspace: "workspace",
  people: "people",
  team: "people",
  whatsapp: "whatsapp",
  billing: "billing",
  developers: "developers",
  developer: "developers",
  growth: "growth",
  intelligence: "intelligence",
  account: "account",
  "assignment-rules": "people",
};
