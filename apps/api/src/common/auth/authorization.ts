import { ForbiddenException } from "@nestjs/common";
import {
  assertConversationAssignment,
  assertLeadOwnership,
  assertTaskAssignment,
  assertTaskCreateAssignment,
  AuthorizationError,
  canInviteRole,
  hasCapability,
  type Capability,
  type LeadOwnershipAction,
} from "@growvisi/shared";
import type { JwtPayload, MembershipRole } from "@growvisi/shared";

export function requireCapability(user: JwtPayload, capability: Capability): void {
  if (!hasCapability(user.role, capability)) {
    throw new ForbiddenException("You do not have permission to do this.");
  }
}

export function requireInviteRole(user: JwtPayload, inviteRole: MembershipRole): void {
  if (!canInviteRole(user.role, inviteRole)) {
    throw new ForbiddenException("You cannot invite someone with this role.");
  }
}

export function requireConversationAssignment(
  user: JwtPayload,
  currentAssigneeId: string | null | undefined,
  nextAssigneeId: string | null,
): void {
  try {
    assertConversationAssignment(user.role, user.sub, currentAssigneeId, nextAssigneeId);
  } catch (e) {
    if (e instanceof AuthorizationError) {
      throw new ForbiddenException(e.message);
    }
    throw e;
  }
}

export function requireTaskAssignment(
  user: JwtPayload,
  currentAssigneeId: string | null | undefined,
  nextAssigneeId: string | null,
): void {
  try {
    assertTaskAssignment(user.role, user.sub, currentAssigneeId, nextAssigneeId);
  } catch (e) {
    if (e instanceof AuthorizationError) {
      throw new ForbiddenException(e.message);
    }
    throw e;
  }
}

export function requireTaskCreateAssignment(
  user: JwtPayload,
  assignedToId: string | null | undefined,
): void {
  try {
    assertTaskCreateAssignment(user.role, user.sub, assignedToId);
  } catch (e) {
    if (e instanceof AuthorizationError) {
      throw new ForbiddenException(e.message);
    }
    throw e;
  }
}

export function requireLeadOwnership(
  user: JwtPayload,
  ownerId: string | null | undefined,
  action: LeadOwnershipAction,
): void {
  try {
    assertLeadOwnership(user.role, user.sub, ownerId, action);
  } catch (e) {
    if (e instanceof AuthorizationError) {
      throw new ForbiddenException(e.message);
    }
    throw e;
  }
}
