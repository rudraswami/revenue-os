export type AgencyClientOwnerStatus = "owner_active" | "invite_pending" | "needs_owner";

export type AgencyClientTrialUrgency = "none" | "ending_soon" | "expired";

const TRIAL_ENDING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export function resolveOwnerStatus(
  hasOwner: boolean,
  hasPendingOwnerInvite: boolean,
): AgencyClientOwnerStatus {
  if (hasOwner) return "owner_active";
  if (hasPendingOwnerInvite) return "invite_pending";
  return "needs_owner";
}

export function resolveTrialUrgency(
  planId: string,
  trialEndsAt: Date | null,
  nowMs = Date.now(),
): AgencyClientTrialUrgency {
  if (planId !== "trial" || !trialEndsAt) return "none";
  const remainingMs = trialEndsAt.getTime() - nowMs;
  if (remainingMs < 0) return "expired";
  if (remainingMs <= TRIAL_ENDING_SOON_MS) return "ending_soon";
  return "none";
}

export function isPaidSubscription(planId: string, subscriptionStatus: string): boolean {
  return planId !== "trial" && subscriptionStatus === "ACTIVE";
}
