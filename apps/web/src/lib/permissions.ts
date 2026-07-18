import type { MembershipRole } from "@growvisi/shared";
import {
  assertTaskAssignment,
  canInviteRole as sharedCanInviteRole,
  hasCapability,
  INVITE_ROLE_OPTIONS,
  roleInviteDescription,
  roleUiLabel,
  type Capability,
} from "@growvisi/shared";

export {
  INVITE_ROLE_OPTIONS,
  roleInviteDescription,
  roleUiLabel,
  type Capability,
};

/** @deprecated Use hasCapability(role, 'inbox.reply') — kept for gradual migration */
export function canWrite(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "inbox.reply");
}

export function canManageTeam(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "team.manage");
}

export function canManageCampaigns(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "campaigns.manage");
}

export function canManageBilling(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "billing.manage");
}

export function canConnectWhatsapp(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "whatsapp.connect");
}

export function canAssignWork(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "inbox.assign.others");
}

export function canAssignToSelf(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "inbox.assign.self");
}

export function canDelegateAssignment(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "inbox.assign.delegate");
}

export function canToggleInboxAi(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "inbox.ai.toggle");
}

export function canAssignTasksToOthers(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "tasks.assign.others");
}

export function canViewTeamTasks(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "tasks.view.team");
}

export function canInviteMembers(role: MembershipRole | null | undefined): boolean {
  if (!role) return false;
  return hasCapability(role, "team.manage") || hasCapability(role, "team.invite.team");
}

export function canInviteRole(
  actorRole: MembershipRole | null | undefined,
  inviteRole: MembershipRole,
): boolean {
  if (!actorRole) return false;
  return sharedCanInviteRole(actorRole, inviteRole);
}

export function canReassignTask(
  role: MembershipRole | null | undefined,
  userId: string | undefined,
  task: { assignedToId?: string | null },
  nextAssigneeId: string | null,
): boolean {
  if (!role || !userId) return false;
  try {
    assertTaskAssignment(role, userId, task.assignedToId, nextAssigneeId);
    return true;
  } catch {
    return false;
  }
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: roleUiLabel("OWNER"),
  ADMIN: roleUiLabel("ADMIN"),
  MANAGER: roleUiLabel("MANAGER"),
  AGENT: roleUiLabel("AGENT"),
  VIEWER: roleUiLabel("VIEWER"),
};

/** Three UI roles for invite picker (+ Admin for workspace admins). */
export const INVITE_ROLES: MembershipRole[] = INVITE_ROLE_OPTIONS;

export const INVITE_ROLE_HINTS: Record<MembershipRole, string> = {
  OWNER: roleInviteDescription("OWNER"),
  ADMIN: roleInviteDescription("ADMIN"),
  MANAGER: roleInviteDescription("MANAGER"),
  AGENT: roleInviteDescription("AGENT"),
  VIEWER: roleInviteDescription("VIEWER"),
};

export function hasCap(role: MembershipRole | null | undefined, cap: Capability): boolean {
  return !!role && hasCapability(role, cap);
}

export function canMoveLead(
  role: MembershipRole | null | undefined,
  userId: string | undefined,
  lead: { ownerId?: string | null },
): boolean {
  if (!role || !userId) return false;
  if (hasCapability(role, "pipeline.move.others")) return true;
  const owner = lead.ownerId ?? null;
  return (!owner || owner === userId) && hasCapability(role, "pipeline.move.own");
}

export function canEditLead(
  role: MembershipRole | null | undefined,
  userId: string | undefined,
  lead: { ownerId?: string | null },
): boolean {
  if (!role || !userId) return false;
  if (hasCapability(role, "contacts.edit.others")) return true;
  const owner = lead.ownerId ?? null;
  return (!owner || owner === userId) && hasCapability(role, "contacts.edit.own");
}

export function canDeleteTags(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "tags.delete");
}

export function canViewTeamAnalytics(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "analytics.view.team");
}

export function canExportContacts(role: MembershipRole | null | undefined): boolean {
  return !!role && hasCapability(role, "contacts.export");
}
