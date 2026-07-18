import type { MembershipRole } from "./types";

/** Atomic business permissions — source of truth for authorization. */
export type Capability =
  | "inbox.view.team"
  | "inbox.reply"
  | "inbox.assign.others"
  | "inbox.assign.self"
  | "inbox.assign.delegate"
  | "inbox.ai.toggle"
  | "inbox.ai.correct"
  | "tasks.view.team"
  | "tasks.create.self"
  | "tasks.create.others"
  | "tasks.assign.others"
  | "tasks.assign.delegate"
  | "tasks.claim"
  | "tasks.delete"
  | "pipeline.move.own"
  | "pipeline.move.others"
  | "pipeline.value.own"
  | "pipeline.value.others"
  | "contacts.view.team"
  | "contacts.create"
  | "contacts.edit.own"
  | "contacts.edit.others"
  | "contacts.export"
  | "tags.manage"
  | "campaigns.manage"
  | "automations.manage"
  | "analytics.view.team"
  | "analytics.insights.act"
  | "knowledge.manage"
  | "templates.manage"
  | "whatsapp.connect"
  | "whatsapp.manage"
  | "billing.view"
  | "billing.manage"
  | "team.view"
  | "team.invite.admin"
  | "team.invite.manager"
  | "team.invite.team"
  | "team.manage"
  | "workspace.settings"
  | "workspace.audit"
  | "developers.keys"
  | "agency.manage"
  | "tags.delete";

const ALL_CAPABILITIES: Capability[] = [
  "inbox.view.team",
  "inbox.reply",
  "inbox.assign.others",
  "inbox.assign.self",
  "inbox.assign.delegate",
  "inbox.ai.toggle",
  "inbox.ai.correct",
  "tasks.view.team",
  "tasks.create.self",
  "tasks.create.others",
  "tasks.assign.others",
  "tasks.assign.delegate",
  "tasks.claim",
  "tasks.delete",
  "pipeline.move.own",
  "pipeline.move.others",
  "pipeline.value.own",
  "pipeline.value.others",
  "contacts.view.team",
  "contacts.create",
  "contacts.edit.own",
  "contacts.edit.others",
  "contacts.export",
  "tags.manage",
  "campaigns.manage",
  "automations.manage",
  "analytics.view.team",
  "analytics.insights.act",
  "knowledge.manage",
  "templates.manage",
  "whatsapp.connect",
  "whatsapp.manage",
  "billing.view",
  "billing.manage",
  "team.view",
  "team.invite.admin",
  "team.invite.manager",
  "team.invite.team",
  "team.manage",
  "workspace.settings",
  "workspace.audit",
  "developers.keys",
  "agency.manage",
  "tags.delete",
];

const ADMIN_CAPS = new Set<Capability>(ALL_CAPABILITIES);

const MANAGER_CAPS = new Set<Capability>(
  ALL_CAPABILITIES.filter(
    (c) =>
      ![
        "billing.view",
        "billing.manage",
        "team.invite.admin",
        "team.invite.manager",
        "team.manage",
        "workspace.settings",
        "workspace.audit",
        "developers.keys",
        "agency.manage",
        "whatsapp.connect",
        "whatsapp.manage",
        "templates.manage",
      ].includes(c),
  ),
);

const TEAM_CAPS = new Set<Capability>([
  "inbox.reply",
  "inbox.assign.self",
  "inbox.assign.delegate",
  "inbox.ai.correct",
  "tasks.create.self",
  "tasks.assign.delegate",
  "tasks.claim",
  "team.view",
  "pipeline.move.own",
  "pipeline.value.own",
  "contacts.view.team",
  "contacts.create",
  "contacts.edit.own",
  "tags.manage",
]);

const VIEWER_CAPS = new Set<Capability>(["team.view", "contacts.view.team"]);

const ROLE_CAPABILITIES: Record<MembershipRole, ReadonlySet<Capability>> = {
  OWNER: ADMIN_CAPS,
  ADMIN: ADMIN_CAPS,
  MANAGER: MANAGER_CAPS,
  AGENT: TEAM_CAPS,
  VIEWER: VIEWER_CAPS,
};

/** UI-facing invite roles (Viewer deprecated for new invites). */
export const INVITE_ROLE_OPTIONS: MembershipRole[] = ["ADMIN", "MANAGER", "AGENT"];

export const ROLE_UI_LABELS: Record<MembershipRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  AGENT: "Team",
  VIEWER: "Viewer",
};

export const ROLE_INVITE_DESCRIPTIONS: Record<MembershipRole, string> = {
  OWNER: "Workspace creator with full control.",
  ADMIN: "Billing, WhatsApp, team, and all workspace settings.",
  MANAGER: "Assign leads, run campaigns, and manage the sales floor.",
  AGENT: "Reply in Inbox, update pipeline, and complete follow-ups.",
  VIEWER: "Read-only access (legacy).",
};

export function roleUiLabel(role: MembershipRole): string {
  return ROLE_UI_LABELS[role] ?? role;
}

export function roleInviteDescription(role: MembershipRole): string {
  return ROLE_INVITE_DESCRIPTIONS[role] ?? "";
}

export function resolveCapabilities(role: MembershipRole): ReadonlySet<Capability> {
  return ROLE_CAPABILITIES[role] ?? VIEWER_CAPS;
}

export function hasCapability(role: MembershipRole, capability: Capability): boolean {
  return resolveCapabilities(role).has(capability);
}

export function canInviteRole(actorRole: MembershipRole, inviteRole: MembershipRole): boolean {
  if (inviteRole === "OWNER" || inviteRole === "VIEWER") return false;
  if (hasCapability(actorRole, "team.manage")) return true;
  if (inviteRole === "AGENT" && hasCapability(actorRole, "team.invite.team")) return true;
  if (inviteRole === "MANAGER" && hasCapability(actorRole, "team.invite.manager")) return false;
  if (inviteRole === "ADMIN" && hasCapability(actorRole, "team.invite.admin")) return false;
  return false;
}

export type OwnableResource = {
  assignedToId?: string | null;
  ownerId?: string | null;
};

/** Conversation / thread assignment policy. */
export function assertConversationAssignment(
  role: MembershipRole,
  userId: string,
  currentAssigneeId: string | null | undefined,
  nextAssigneeId: string | null,
): void {
  const current = currentAssigneeId ?? null;

  if (nextAssigneeId === userId) {
    if (current && current !== userId) {
      throw assignmentError("This conversation is assigned to someone else.");
    }
    if (!hasCapability(role, "inbox.assign.self")) {
      throw assignmentError("You cannot take over this conversation.");
    }
    return;
  }

  if (nextAssigneeId === null) {
    if (!hasCapability(role, "inbox.assign.others")) {
      throw assignmentError("Only managers can unassign conversations.");
    }
    return;
  }

  if (current === userId && nextAssigneeId !== userId) {
    if (!hasCapability(role, "inbox.assign.delegate")) {
      throw assignmentError("You cannot reassign this conversation.");
    }
    return;
  }

  if (!hasCapability(role, "inbox.assign.others")) {
    throw assignmentError("You cannot assign conversations to teammates.");
  }
}

/** Task assignment policy. */
export function assertTaskAssignment(
  role: MembershipRole,
  userId: string,
  currentAssigneeId: string | null | undefined,
  nextAssigneeId: string | null,
): void {
  const current = currentAssigneeId ?? null;

  if (nextAssigneeId === userId) {
    if (current && current !== userId) {
      throw assignmentError("This task belongs to someone else.");
    }
    if (!current && !hasCapability(role, "tasks.claim")) {
      throw assignmentError("You cannot claim this task.");
    }
    return;
  }

  if (nextAssigneeId === null) {
    if (!hasCapability(role, "tasks.assign.others")) {
      throw assignmentError("You cannot unassign this task.");
    }
    return;
  }

  if (current === userId) {
    if (!hasCapability(role, "tasks.assign.delegate")) {
      throw assignmentError("You cannot reassign this task.");
    }
    return;
  }

  if (!hasCapability(role, "tasks.assign.others")) {
    throw assignmentError("You cannot assign tasks to teammates.");
  }
}

/** Task create — who can set assignee on create. */
export function assertTaskCreateAssignment(
  role: MembershipRole,
  userId: string,
  assignedToId: string | null | undefined,
): void {
  const target = assignedToId ?? null;
  if (!target || target === userId) {
    if (!hasCapability(role, "tasks.create.self")) {
      throw assignmentError("You cannot create tasks.");
    }
    return;
  }
  if (!hasCapability(role, "tasks.create.others")) {
    throw assignmentError("You can only create tasks for yourself.");
  }
}

export type LeadOwnershipAction = "move" | "edit" | "value" | "owner";

/** Pipeline / contact ownership — Team edits own deals; Manager+ edits any. */
export function assertLeadOwnership(
  role: MembershipRole,
  userId: string,
  ownerId: string | null | undefined,
  action: LeadOwnershipAction,
): void {
  const owner = ownerId ?? null;
  const isOwn = !owner || owner === userId;

  if (action === "move") {
    if (hasCapability(role, "pipeline.move.others")) return;
    if (isOwn && hasCapability(role, "pipeline.move.own")) return;
    throw assignmentError("You can only move deals you own.");
  }

  if (action === "value") {
    if (hasCapability(role, "pipeline.value.others")) return;
    if (isOwn && hasCapability(role, "pipeline.value.own")) return;
    throw assignmentError("You can only set value on deals you own.");
  }

  if (action === "owner") {
    if (hasCapability(role, "contacts.edit.others")) return;
    throw assignmentError("You cannot change deal ownership.");
  }

  if (action === "edit") {
    if (hasCapability(role, "contacts.edit.others")) return;
    if (isOwn && hasCapability(role, "contacts.edit.own")) return;
    throw assignmentError("You can only edit contacts you own.");
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

function assignmentError(message: string): AuthorizationError {
  return new AuthorizationError(message);
}
