/**
 * Post-activation coaching — week-2 habit after first classify.
 * Sequence: morning digest → first invite → first takeover.
 * One next step only (no banner pile).
 */

export type CoachingStepId = "digest" | "invite" | "takeover";

export type PostActivationCoaching = {
  eligible: boolean;
  digestOn: boolean;
  hasTeam: boolean;
  hasTakeover: boolean;
  completedCount: number;
  totalSteps: 3;
  allComplete: boolean;
  next: null | {
    id: CoachingStepId;
    title: string;
    description: string;
    href: string;
  };
};

export function buildPostActivationCoaching(input: {
  /** First scored lead — coaching only after Aha */
  firstValue: boolean;
  digestEnabled: boolean;
  hasTeam: boolean;
  hasTakeover: boolean;
  /** Prefer handoff queue when work is waiting */
  handoffsWaiting?: number;
}): PostActivationCoaching {
  const digestOn = !!input.digestEnabled;
  const hasTeam = !!input.hasTeam;
  const hasTakeover = !!input.hasTakeover;
  const stepsDone = [digestOn, hasTeam, hasTakeover].filter(Boolean).length;

  if (!input.firstValue) {
    return {
      eligible: false,
      digestOn,
      hasTeam,
      hasTakeover,
      completedCount: stepsDone,
      totalSteps: 3,
      allComplete: false,
      next: null,
    };
  }

  let next: PostActivationCoaching["next"] = null;
  if (!digestOn) {
    next = {
      id: "digest",
      title: "Turn on morning digest",
      description: "Each morning: pipeline ₹, hot leads, and chats waiting — before the floor opens.",
      href: "/dashboard/automations",
    };
  } else if (!hasTeam) {
    next = {
      id: "invite",
      title: "Invite a teammate",
      description: "Share Your turn so hot leads aren’t stuck on one phone.",
      href: "/dashboard/settings?tab=people",
    };
  } else if (!hasTakeover) {
    const waiting = (input.handoffsWaiting ?? 0) > 0;
    next = {
      id: "takeover",
      title: waiting ? "Try Reply now on Your turn" : "Practice Reply now",
      description: waiting
        ? "Assign + task + clear the alert in one click — faster than hunting on WhatsApp."
        : "Next time a chat needs you, use Reply now — assigns you and creates a follow-up task.",
      href: waiting ? "/dashboard/inbox?filter=handoff" : "/dashboard/inbox",
    };
  }

  return {
    eligible: true,
    digestOn,
    hasTeam,
    hasTakeover,
    completedCount: stepsDone,
    totalSteps: 3,
    allComplete: next == null,
    next,
  };
}
