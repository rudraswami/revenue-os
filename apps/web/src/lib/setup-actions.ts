import type { MembershipRole } from "@growvisi/shared";
import { hasCapability } from "@growvisi/shared";

export type SetupActionPriority = "critical" | "recommended";

export type SetupAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: SetupActionPriority;
  order: number;
};

export type OnboardingProgressInput = {
  whatsappConnected: boolean;
  firstInbound: boolean;
  aiClassified: boolean;
  pipelineMoved: boolean;
  ops?: {
    stage: string;
    paid: boolean;
    firstValue: boolean;
    firstAction: boolean;
  };
  coaching?: {
    eligible: boolean;
    allComplete: boolean;
    next: null | {
      id: string;
      title: string;
      description: string;
      href: string;
    };
  };
};

export type ConnectionHealthInput = {
  tokenHealth?: { valid?: boolean; needsRefresh: boolean };
  checks?: Array<{ id: string; ok: boolean }>;
  stats?: { inboundCount: number };
} | null;

export type SetupActor = {
  role: MembershipRole | null | undefined;
};

export type AgencyHealthSummary = {
  total: number;
  live: number;
  setup: number;
  token: number;
  disconnected: number;
  handoffs: number;
  unreadMessages: number;
};

export type SetupActionsInput = {
  billing: {
    entitlements?: {
      trialExpired: boolean;
      trialEndsAt: string | null;
      hasAccess: boolean;
      planId: string;
    };
    usage?: {
      teamMembers: number;
      whatsappNumbers: number;
      monthlyLeads: number;
    };
    limits?: {
      teamMembers: number;
      whatsappNumbers: number;
      monthlyLeads: number;
    };
    friction?: {
      seatsAtLimit: boolean;
      whatsappAtLimit: boolean;
      leadsAtLimit: boolean;
      primaryReason: string | null;
      suggestedPlan: string | null;
    };
  } | null | undefined;
  progress: OnboardingProgressInput | null | undefined;
  accounts: Array<{ isActive: boolean }> | null | undefined;
  health: ConnectionHealthInput;
  payment: { hasWebhookSecret: boolean; autoWinOnPayment: boolean } | null | undefined;
  capabilities: { aiClassification: boolean } | null | undefined;
  actor?: SetupActor;
};

const BILLING_ACTION_IDS = new Set([
  "trial-ended",
  "trial-ending",
  "upgrade-after-proof",
  "limit-seats",
  "limit-whatsapp",
  "limit-leads",
  "razorpay-webhook",
  "auto-win",
]);

function healthCheckOk(health: ConnectionHealthInput, id: string): boolean {
  return health?.checks?.find((c) => c.id === id)?.ok ?? false;
}

function webhooksDelivering(health: ConnectionHealthInput): boolean {
  if (!health?.checks?.length) return true;
  return (
    healthCheckOk(health, "meta_webhooks") ||
    (healthCheckOk(health, "webhook_url") &&
      healthCheckOk(health, "verify_token") &&
      healthCheckOk(health, "app_secret"))
  );
}

/** Role-aware filter — when role is unknown, keep operational tasks only. */
export function canSeeSetupAction(actionId: string, actor?: SetupActor): boolean {
  const role = actor?.role;
  if (!role) {
    return !BILLING_ACTION_IDS.has(actionId) && actionId !== "coach-invite";
  }

  if (BILLING_ACTION_IDS.has(actionId)) {
    return hasCapability(role, "billing.manage");
  }

  if (
    actionId === "connect-whatsapp" ||
    actionId === "token-refresh" ||
    actionId === "webhook-delivery"
  ) {
    return hasCapability(role, "whatsapp.connect");
  }

  if (actionId === "coach-invite") {
    return hasCapability(role, "team.manage") || hasCapability(role, "team.invite.team");
  }

  if (actionId === "coach-digest") {
    return hasCapability(role, "automations.manage");
  }

  if (actionId === "razorpay-webhook" || actionId === "auto-win") {
    return hasCapability(role, "billing.manage") || hasCapability(role, "workspace.settings");
  }

  return true;
}

export function activationProgress(progress: OnboardingProgressInput | null | undefined) {
  if (!progress) {
    return { completed: 0, total: 4, inActivation: false };
  }
  const flags = [
    progress.whatsappConnected,
    progress.firstInbound,
    progress.aiClassified,
    progress.pipelineMoved,
  ];
  const completed = flags.filter(Boolean).length;
  return {
    completed,
    total: 4,
    inActivation: completed < 4,
  };
}

export function computeAgencySetupActions(summary: AgencyHealthSummary | null | undefined) {
  if (!summary) {
    return emptySetupResult();
  }

  const actions: SetupAction[] = [];

  if (summary.total === 0) {
    actions.push({
      id: "agency-add-client",
      title: "Add your first client",
      description: "Create a client workspace and connect their WhatsApp from Agency hub.",
      href: "/dashboard/agency",
      priority: "recommended",
      order: 0,
    });
  }

  if (summary.disconnected > 0) {
    const n = summary.disconnected;
    actions.push({
      id: "agency-connect",
      title: n === 1 ? "1 client needs WhatsApp" : `${n} clients need WhatsApp`,
      description: "Connect their business line with Meta Embedded Signup.",
      href: "/dashboard/agency",
      priority: "critical",
      order: 1,
    });
  }

  if (summary.token > 0) {
    const n = summary.token;
    actions.push({
      id: "agency-reconnect",
      title: n === 1 ? "1 client needs reconnect" : `${n} clients need reconnect`,
      description: "Meta access expired — reconnect from Agency hub.",
      href: "/dashboard/agency",
      priority: "critical",
      order: 2,
    });
  }

  if (summary.setup > 0) {
    const n = summary.setup;
    actions.push({
      id: "agency-setup",
      title: n === 1 ? "1 client finishing setup" : `${n} clients finishing setup`,
      description: "Help them receive a test message and see AI classify.",
      href: "/dashboard/agency",
      priority: "recommended",
      order: 10,
    });
  }

  if (summary.handoffs > 0) {
    const n = summary.handoffs;
    actions.push({
      id: "agency-handoffs",
      title: n === 1 ? "1 handoff waiting" : `${n} handoffs across portfolio`,
      description: "Clients have chats flagged for human follow-up.",
      href: "/dashboard/agency",
      priority: "recommended",
      order: 15,
    });
  }

  actions.sort((a, b) => a.order - b.order);
  return finalizeSetupActions(actions, null);
}

function emptySetupResult() {
  return {
    actions: [] as SetupAction[],
    criticalCount: 0,
    totalCount: 0,
    allComplete: true,
    opsStage: null as string | null,
    opsPaid: false,
    activation: { completed: 0, total: 4, inActivation: false },
    featuredAction: null as SetupAction | null,
  };
}

function finalizeSetupActions(actions: SetupAction[], opsStage: string | null, opsPaid = false) {
  const criticalCount = actions.filter((a) => a.priority === "critical").length;
  return {
    actions,
    criticalCount,
    totalCount: actions.length,
    allComplete: actions.length === 0,
    opsStage,
    opsPaid,
    activation: { completed: 0, total: 4, inActivation: false },
    featuredAction: actions[0] ?? null,
  };
}

export function computeSetupActions(input: SetupActionsInput) {
  const { billing, progress, accounts, health, payment, capabilities, actor } = input;
  if (!progress) {
    return emptySetupResult();
  }

  const connected = accounts?.some((a) => a.isActive) ?? false;
  const th = health?.tokenHealth;
  const ent = billing?.entitlements;
  const actions: SetupAction[] = [];
  const activation = activationProgress(progress);

  const trialEnded = ent && !ent.hasAccess && ent.trialExpired;
  const trialEndsSoon =
    ent?.hasAccess &&
    ent.trialEndsAt &&
    new Date(ent.trialEndsAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  if (trialEnded) {
    actions.push({
      id: "trial-ended",
      title: "Pick a plan",
      description: "Trial ended — upgrade to keep WhatsApp and AI running.",
      href: "/dashboard/pricing",
      priority: "critical",
      order: 0,
    });
  } else if (trialEndsSoon) {
    actions.push({
      id: "trial-ending",
      title: "Trial ending soon",
      description: `Ends ${new Date(ent!.trialEndsAt!).toLocaleDateString()} — choose a plan.`,
      href: "/dashboard/pricing",
      priority: "critical",
      order: 1,
    });
  }

  if (!progress.whatsappConnected) {
    actions.push({
      id: "connect-whatsapp",
      title: "Connect WhatsApp",
      description: "Link your business line with Meta Embedded Signup in Settings.",
      href: "/dashboard/settings?tab=whatsapp",
      priority: "critical",
      order: 10,
    });
  }

  if (connected && th && (!th.valid || th.needsRefresh)) {
    actions.push({
      id: "token-refresh",
      title: "Reconnect WhatsApp",
      description: "Meta access expired or invalid — reconnect with Meta in Settings.",
      href: "/dashboard/settings?tab=whatsapp",
      priority: "critical",
      order: 11,
    });
  }

  if (
    connected &&
    progress.whatsappConnected &&
    !progress.firstInbound &&
    health?.checks?.length &&
    !webhooksDelivering(health)
  ) {
    actions.push({
      id: "webhook-delivery",
      title: "Confirm message delivery",
      description:
        "Meta webhooks aren’t confirmed yet — open Connection health or send a test message.",
      href: "/dashboard/connection",
      priority: "critical",
      order: 12,
    });
  }

  if (progress.whatsappConnected && !progress.firstInbound) {
    actions.push({
      id: "first-inbound",
      title: "Receive first message",
      description: "Send a test WhatsApp to your business number from your phone.",
      href: "/dashboard/inbox",
      priority: "recommended",
      order: 20,
    });
  }

  if (progress.firstInbound && !progress.aiClassified && capabilities?.aiClassification !== false) {
    actions.push({
      id: "ai-classify",
      title: "See AI classify a lead",
      description: "Open Inbox — intent score and suggested stage on the thread.",
      href: "/dashboard/inbox",
      priority: "recommended",
      order: 21,
    });
  }

  if (progress.firstInbound && !progress.pipelineMoved) {
    actions.push({
      id: "pipeline-move",
      title: "Move a deal on Pipeline",
      description: "Drag a card to Won — revenue ₹ shows on Home.",
      href: "/dashboard/pipeline",
      priority: "recommended",
      order: 22,
    });
  }

  if (progress.coaching?.eligible && progress.coaching.next) {
    const n = progress.coaching.next;
    actions.push({
      id: `coach-${n.id}`,
      title: n.title,
      description: n.description,
      href: n.href,
      priority: "recommended",
      order: 14,
    });
  }

  if (
    ent?.hasAccess &&
    ent.planId === "trial" &&
    !progress.ops?.paid &&
    progress.aiClassified &&
    !trialEnded &&
    !trialEndsSoon &&
    (!progress.coaching?.eligible || progress.coaching.allComplete || !progress.coaching.next)
  ) {
    actions.push({
      id: "upgrade-after-proof",
      title: "Lock in your plan",
      description: "AI scoring is live — upgrade from ₹999/mo before trial ends.",
      href: "/dashboard/pricing",
      priority: "recommended",
      order: 25,
    });
  }

  const onGrowthPlus = ent?.planId === "growth" || ent?.planId === "pro";
  if (connected && payment && onGrowthPlus && progress.pipelineMoved) {
    if (!payment.hasWebhookSecret) {
      actions.push({
        id: "razorpay-webhook",
        title: "Connect Razorpay → Won",
        description: "Auto-mark deals won when payment lands — add webhook in Settings.",
        href: "/dashboard/settings?tab=growth",
        priority: "recommended",
        order: 31,
      });
    } else if (!payment.autoWinOnPayment) {
      actions.push({
        id: "auto-win",
        title: "Enable auto-mark Won",
        description: "Turn on Razorpay payment → Won in Growth settings.",
        href: "/dashboard/settings?tab=growth",
        priority: "recommended",
        order: 32,
      });
    }
  }

  const friction = billing?.friction;
  if (friction?.seatsAtLimit && ent?.hasAccess) {
    const plan = friction.suggestedPlan ?? "growth";
    actions.push({
      id: "limit-seats",
      title: "Need more seats",
      description: `Team full (${billing?.usage?.teamMembers ?? "?"}/${billing?.limits?.teamMembers ?? "?"}) — upgrade to invite the next agent.`,
      href: `/dashboard/pricing?plan=${plan}&reason=seats`,
      priority: "recommended",
      order: 5,
    });
  }
  if (friction?.whatsappAtLimit && ent?.hasAccess) {
    const plan = friction.suggestedPlan ?? "growth";
    actions.push({
      id: "limit-whatsapp",
      title: "Need another WhatsApp line",
      description: `Number slots full (${billing?.usage?.whatsappNumbers ?? "?"}/${billing?.limits?.whatsappNumbers ?? "?"}) — upgrade to connect more.`,
      href: `/dashboard/pricing?plan=${plan}&reason=whatsapp`,
      priority: "recommended",
      order: 6,
    });
  }
  if (friction?.leadsAtLimit && ent?.hasAccess) {
    const plan = friction.suggestedPlan ?? "starter";
    actions.push({
      id: "limit-leads",
      title: "Monthly lead cap reached",
      description: `Used ${billing?.usage?.monthlyLeads ?? "?"} of ${billing?.limits?.monthlyLeads ?? "?"} leads — upgrade so new chats keep scoring.`,
      href: `/dashboard/pricing?plan=${plan}&reason=leads`,
      priority: "recommended",
      order: 4,
    });
  }

  const visible = actions.filter((a) => canSeeSetupAction(a.id, actor));
  visible.sort((a, b) => a.order - b.order);

  const criticalCount = visible.filter((a) => a.priority === "critical").length;
  return {
    actions: visible,
    criticalCount,
    totalCount: visible.length,
    allComplete: visible.length === 0,
    opsStage: progress.ops?.stage ?? null,
    opsPaid: !!progress.ops?.paid,
    activation,
    featuredAction: visible[0] ?? null,
  };
}
