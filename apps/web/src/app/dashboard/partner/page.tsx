"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Sparkles, Users, Zap, Building2, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-provider";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  AgencyConnectionBadge,
  type AgencyConnectionStatus,
} from "@/components/dashboard/agency-connection-badge";

const STEPS = [
  {
    title: "Who replies to customers",
    body: "Human replies from Growvisi Conversations (or WhatsApp directly). Optional Meta Business Agent for first-line FAQ. Growvisi AI never auto-sends customer messages.",
    links: [
      { label: "Open Conversations", href: "/dashboard/inbox" },
      {
        label: "Meta Business Agent docs (optional)",
        href: "https://developers.facebook.com/docs/whatsapp/business-management-api/business-agent",
      },
    ],
  },
  {
    title: "Connect WhatsApp to Growvisi",
    body: "Paste API Setup token or complete Embedded Signup (Tech Provider). Growvisi ingests messages, classifies intent, flags conversations that need your team, and updates pipeline.",
    links: [
      { label: "Growvisi onboarding", href: "/onboarding" },
      { label: "WhatsApp settings", href: "/dashboard/settings?tab=whatsapp" },
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
    body: "Train the client: Conversations for threads + human reply, Pipeline for deals, take over when AI flags a hot lead.",
    links: [
      { label: "Open Conversations", href: "/dashboard/inbox" },
      { label: "Intelligence explainer", href: "/dashboard/ai" },
    ],
  },
] as const;

const CLIENT_EMAIL_TEMPLATE = `Hi {{client_name}},

We're setting up your WhatsApp revenue stack:

1. Your team replies from Growvisi Conversations (human messages) — optional Meta Business Agent for FAQ
2. Growvisi — AI classifies leads, pipeline, team alerts, and morning digest

You'll get a Growvisi workspace invite. Connect your WhatsApp Business number, send a test message, and we'll verify classification + pipeline in under 15 minutes.

Questions? Reply to this email.

— {{partner_name}}`;

interface AgencyHealthClient {
  displayName: string;
  organizationId: string;
  connectionStatus: AgencyConnectionStatus;
  goLiveProgressPct: number;
  displayPhoneNumber: string | null;
  tokenNeedsRefresh: boolean;
}

export default function PartnerPage() {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);

  const { data: agencyStatus } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () => apiFetch<{ isAgency: boolean }>("/agency/status", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: healthSummary } = useQuery({
    queryKey: ["agency-clients-health"],
    queryFn: () =>
      apiFetch<{
        total: number;
        live: number;
        setup: number;
        token: number;
        disconnected: number;
        clients: AgencyHealthClient[];
      }>("/agency/clients/health-summary", { token: token ?? undefined }),
    enabled: !!token && !!agencyStatus?.isAgency,
  });

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
          <Users className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">Humans reply</p>
          <p className="mt-1 text-xs text-muted-foreground">Conversations takeover or WhatsApp directly</p>
        </div>
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <Sparkles className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">Growvisi AI classifies</p>
          <p className="mt-1 text-xs text-muted-foreground">Intent, pipeline, alerts — no auto-send</p>
        </div>
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <Zap className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">India-ready</p>
          <p className="mt-1 text-xs text-muted-foreground">INR billing, Razorpay, Hindi digest</p>
        </div>
      </div>

      {agencyStatus?.isAgency && healthSummary && (
        <DashboardPanel className="mb-6" title="Client connection health">
          <p className="text-sm text-muted-foreground">
            Monitor go-live progress across your portfolio. Switch into a client workspace to finish
            setup or refresh tokens.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {(
              [
                ["live", healthSummary.live],
                ["setup", healthSummary.setup],
                ["token", healthSummary.token],
                ["disconnected", healthSummary.disconnected],
              ] as const
            ).map(([status, count]) => (
              <div key={status} className="rounded-xl border border-[#dce9ff] bg-[#f8f9ff]/50 px-3 py-2">
                <AgencyConnectionBadge status={status} />
                <p className="mt-1 text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
          {healthSummary.clients.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-[#dce9ff]">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-[#dce9ff] bg-[#f8f9ff]/80 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Client</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Go-live</th>
                    <th className="px-4 py-2.5 font-semibold">Number</th>
                  </tr>
                </thead>
                <tbody>
                  {healthSummary.clients.map((client) => (
                    <tr key={client.organizationId} className="border-b border-[#dce9ff]/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{client.displayName}</td>
                      <td className="px-4 py-3">
                        <AgencyConnectionBadge status={client.connectionStatus} />
                        {client.tokenNeedsRefresh && (
                          <p className="mt-1 text-xs text-red-700">Token refresh needed</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{client.goLiveProgressPct}%</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.displayPhoneNumber ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button asChild size="sm" variant="outline" className="mt-4 gap-1.5 rounded-xl">
            <Link href="/dashboard/agency">
              <Building2 className="h-3.5 w-3.5" />
              Open Agency dashboard
            </Link>
          </Button>
        </DashboardPanel>
      )}

      <DashboardPanel className="mb-6" title="Meta Solution Partner & credit line">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">WhatsApp conversation charges</strong> are billed by
              Meta directly to the client&apos;s WABA or your Solution Partner credit line — not through
              Growvisi.
            </p>
            <p>
              Growvisi bills clients in <strong className="text-foreground">INR (₹/mo)</strong> for the
              revenue layer: classification, pipeline, team, and automations. Set{" "}
              <code className="rounded bg-muted px-1 text-xs">META_PARTNER_SOLUTION_ID</code> on the API
              when you are an approved Tech Provider so Embedded Signup attaches to your partner solution.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              <li>Meta credit line: managed in Meta Business Manager → WhatsApp Accounts</li>
              <li>Growvisi does not resell Meta credits or markup conversation fees in v1</li>
              <li>See <code className="rounded bg-muted px-1">docs/META-TECH-PROVIDER.md</code> for TP onboarding</li>
            </ul>
          </div>
        </div>
      </DashboardPanel>

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
