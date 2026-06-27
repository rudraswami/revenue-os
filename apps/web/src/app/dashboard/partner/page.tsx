"use client";

import Link from "next/link";
import { ExternalLink, MessageCircle, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-provider";

const STEPS = [
  {
    title: "Meta Business Agent (customer replies)",
    body: "Customer-facing AI replies stay in WhatsApp via Meta Business Agent. Growvisi does not auto-reply customers in v1.",
    links: [
      { label: "Meta Business Agent docs", href: "https://developers.facebook.com/docs/whatsapp/business-management-api/business-agent" },
      { label: "WhatsApp Cloud API setup", href: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" },
    ],
  },
  {
    title: "Connect WhatsApp to Growvisi",
    body: "Paste API Setup token or complete Embedded Signup (Tech Provider). Growvisi ingests messages, classifies intent, and updates pipeline.",
    links: [
      { label: "Growvisi onboarding", href: "/onboarding" },
      { label: "Connection health", href: "/dashboard/connection" },
    ],
  },
  {
    title: "Configure revenue layer",
    body: "Add business context, assignment rules, automations (email alerts), and optional Razorpay payment → Won webhook.",
    links: [
      { label: "Settings → WhatsApp", href: "/dashboard/settings?tab=whatsapp" },
      { label: "Settings → Growth", href: "/dashboard/settings?tab=growth" },
    ],
  },
  {
    title: "Hand off to the sales team",
    body: "Train the client: Conversations for threads, Pipeline for deals, one-click Take over on handoffs. Meta handles chat; Growvisi handles revenue ops.",
    links: [
      { label: "Open Conversations", href: "/dashboard/inbox" },
      { label: "Intelligence explainer", href: "/dashboard/ai" },
    ],
  },
] as const;

const CLIENT_EMAIL_TEMPLATE = `Hi {{client_name}},

We're setting up your WhatsApp revenue stack:

1. Meta Business Agent — replies to customers inside WhatsApp (Meta-owned)
2. Growvisi — classifies leads, pipeline, team alerts, and morning digest

You'll get a Growvisi workspace invite. Connect your WhatsApp Business number, send a test message, and we'll verify classification + pipeline in under 15 minutes.

Questions? Reply to this email.

— {{partner_name}}`;

export default function PartnerPage() {
  const { t } = useI18n();

  function copyTemplate() {
    void navigator.clipboard.writeText(CLIENT_EMAIL_TEMPLATE);
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={t("groups.growth")}
        title={t("partner.title")}
        description={t("partner.description")}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <MessageCircle className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">Meta owns replies</p>
          <p className="mt-1 text-xs text-muted-foreground">Business Agent in WhatsApp chat</p>
        </div>
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <Sparkles className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">Growvisi owns revenue ops</p>
          <p className="mt-1 text-xs text-muted-foreground">Classify, pipeline, assign, alert</p>
        </div>
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <Zap className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">India-ready</p>
          <p className="mt-1 text-xs text-muted-foreground">INR billing, Razorpay, Hindi UI</p>
        </div>
      </div>

      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <DashboardPanel key={step.title} title={`${i + 1}. ${step.title}`}>
            <p className="text-sm text-muted-foreground">{step.body}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {step.links.map((link) => (
                <li key={link.href}>
                  <Button asChild variant="outline" size="sm" className="h-8 gap-1 rounded-xl text-xs">
                    <Link href={link.href}>
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </DashboardPanel>
        ))}
      </div>

      <DashboardPanel className="mt-6" title="Client onboarding email (copy-paste)">
        <pre className="overflow-x-auto rounded-xl bg-[#f8f9ff] p-4 text-xs leading-relaxed text-foreground">
          {CLIENT_EMAIL_TEMPLATE}
        </pre>
        <Button type="button" size="sm" variant="outline" className="mt-3 rounded-xl" onClick={copyTemplate}>
          Copy template
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Full kit for Meta solution partners:{" "}
          <a href="/docs/PARTNER-INSTALL-KIT.md" className="font-semibold text-accent hover:underline">
            docs/PARTNER-INSTALL-KIT.md
          </a>
        </p>
      </DashboardPanel>
    </div>
  );
}
