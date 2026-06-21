export type HealthCheck = { id: string; ok: boolean; detail: string };

export type HealthPillar = {
  id: string;
  title: string;
  status: "complete" | "pending" | "attention";
  description: string;
};

const PILLAR_ORDER = [
  "account",
  "webhook_url",
  "verify_token",
  "app_secret",
  "messages_ingested",
  "meta_webhooks",
] as const;

function pillarForCheck(check: HealthCheck): HealthPillar {
  const map: Record<string, Omit<HealthPillar, "id" | "status"> & { status?: HealthPillar["status"] }> = {
    account: {
      title: "Business number",
      description: check.ok
        ? check.detail.replace(/^Active number:\s*/i, "Connected · ")
        : "Connect your WhatsApp Business line in Growvisi.",
    },
    webhook_url: {
      title: "Message routing",
      description: check.ok
        ? "Growvisi is ready to receive customer messages from Meta."
        : "Message routing needs configuration — contact support if this persists.",
    },
    verify_token: {
      title: "Meta handshake",
      description: check.ok
        ? "Webhook verification is configured on our servers."
        : "Webhook verification is incomplete — contact support.",
    },
    app_secret: {
      title: "Message security",
      description: check.ok
        ? "Inbound messages are verified before they reach your inbox."
        : "Security verification is incomplete — contact support.",
    },
    messages_ingested: {
      title: "Inbox delivery",
      description: check.ok
        ? check.detail.replace(/in database/i, "in your workspace")
        : "Send a WhatsApp from your personal phone to your business number to confirm.",
    },
    meta_webhooks: {
      title: "Live sync",
      description: check.ok
        ? "Meta is actively delivering customer events to Growvisi."
        : "Waiting for the first customer message — Meta test sends won't appear here.",
    },
  };

  const base = map[check.id] ?? {
    title: "Status",
    description: check.detail,
  };

  return {
    id: check.id,
    title: base.title,
    description: base.description,
    status: check.ok ? "complete" : check.id === "messages_ingested" || check.id === "meta_webhooks" ? "pending" : "attention",
  };
}

export function healthPillars(checks: HealthCheck[]): HealthPillar[] {
  const byId = new Map(checks.map((c) => [c.id, pillarForCheck(c)]));
  return PILLAR_ORDER.map((id) => byId.get(id)).filter((p): p is HealthPillar => !!p);
}

export type ConnectionSummary = {
  label: "Connected" | "Almost there" | "Needs attention";
  tone: "success" | "pending" | "warning";
  subtitle: string;
};

export function connectionSummary(
  checks: HealthCheck[],
  opts: { hasActiveAccount: boolean; inboundCount: number; tokenNeedsRefresh?: boolean },
): ConnectionSummary {
  if (opts.tokenNeedsRefresh) {
    return {
      label: "Needs attention",
      tone: "warning",
      subtitle: "Refresh your Meta access token to keep messages flowing without interruption.",
    };
  }

  const userChecks = checks.filter((c) =>
    ["account", "messages_ingested", "meta_webhooks"].includes(c.id),
  );
  const infraOk = checks
    .filter((c) => ["webhook_url", "verify_token", "app_secret"].includes(c.id))
    .every((c) => c.ok);

  if (!opts.hasActiveAccount) {
    return {
      label: "Needs attention",
      tone: "warning",
      subtitle: "Connect your WhatsApp Business number to start receiving customer conversations.",
    };
  }

  if (!infraOk) {
    return {
      label: "Needs attention",
      tone: "warning",
      subtitle: "We're finishing server setup on our side — contact support if this doesn't resolve soon.",
    };
  }

  if (opts.inboundCount === 0) {
    return {
      label: "Almost there",
      tone: "pending",
      subtitle: "Your number is connected. Send a test message from your phone to see it in Conversations.",
    };
  }

  if (userChecks.every((c) => c.ok)) {
    return {
      label: "Connected",
      tone: "success",
      subtitle: "Your WhatsApp line is live. Customer messages are syncing to Growvisi.",
    };
  }

  return {
    label: "Almost there",
    tone: "pending",
    subtitle: "Finish the steps below to confirm end-to-end message delivery.",
  };
}
