"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CreditCard,
  ExternalLink,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { useToastOptional } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/locale-provider";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { trackAgencyPartner } from "@/lib/agency-partner-analytics";

export default function PartnerPage() {
  const { t } = useI18n();
  const toast = useToastOptional();
  const token = useAuthStore((s) => s.accessToken);
  const orgName = useAuthStore((s) => s.organization?.name) ?? "Growvisi partner";

  const { data: agencyStatus } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () =>
      apiFetch<{ isAgency: boolean; canEnableAgency: boolean }>("/agency/status", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  useEffect(() => {
    trackAgencyPartner("partner_kit_view", {
      isAgency: agencyStatus?.isAgency,
      canEnable: agencyStatus?.canEnableAgency,
    });
  }, [agencyStatus?.isAgency, agencyStatus?.canEnableAgency]);

  const steps = useMemo(
    () => [
      {
        title: t("partner.step1Title"),
        body: t("partner.step1Body"),
        links: [
          { label: t("partner.ctaConversations"), href: "/dashboard/inbox", external: false },
          {
            label: t("partner.ctaMetaAgent"),
            href: "https://developers.facebook.com/docs/whatsapp/business-management-api/business-agent",
            external: true,
          },
        ],
      },
      {
        title: t("partner.step2Title"),
        body: t("partner.step2Body"),
        links: [{ label: t("partner.ctaAgency"), href: "/dashboard/agency", external: false }],
      },
      {
        title: t("partner.step3Title"),
        body: t("partner.step3Body"),
        links: [{ label: t("partner.ctaAgency"), href: "/dashboard/agency", external: false }],
      },
      {
        title: t("partner.step4Title"),
        body: t("partner.step4Body"),
        links: [{ label: t("partner.ctaConnection"), href: "/dashboard/connection", external: false }],
      },
      {
        title: t("partner.step5Title"),
        body: t("partner.step5Body"),
        links: [
          { label: t("partner.ctaConversations"), href: "/dashboard/inbox", external: false },
          { label: t("partner.ctaPipeline"), href: "/dashboard/pipeline", external: false },
        ],
      },
      {
        title: t("partner.step6Title"),
        body: t("partner.step6Body"),
        links: [
          { label: t("partner.ctaAgency"), href: "/dashboard/agency", external: false },
          { label: t("partner.ctaTeam"), href: "/dashboard/settings?tab=team", external: false },
          { label: t("partner.ctaAutomations"), href: "/dashboard/automations", external: false },
        ],
      },
    ],
    [t],
  );

  const emailTemplate = useMemo(() => {
    return `Hi there,

We're setting up your WhatsApp revenue stack with Growvisi:

1. Your team replies from Growvisi Conversations (human messages) — optional Meta Business Agent for FAQ
2. Growvisi AI classifies leads, updates pipeline ₹, and alerts your team — never auto-replies customers
3. Connect WhatsApp with Meta Embedded Signup (no API token paste)

You'll get a Growvisi workspace invite. Connect your business number, send a test message from your phone, and we'll verify classification + pipeline in under 15 minutes.

— ${orgName}`;
  }, [orgName]);

  function copyTemplate() {
    void navigator.clipboard.writeText(emailTemplate).then(() => {
      toast.success(t("partner.emailCopied"));
      trackAgencyPartner("partner_copy_email");
    });
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow={t("groups.growth")}
        title={t("partner.title")}
        description={t("partner.description")}
      />

      {!agencyStatus?.isAgency && agencyStatus?.canEnableAgency && (
        <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3.5">
          <p className="text-sm font-semibold text-amber-950">{t("partner.enableFirst")}</p>
          <p className="mt-1 text-xs text-amber-900/90">{t("partner.enableFirstBody")}</p>
          <Button asChild size="sm" className="mt-3 rounded-xl">
            <Link
              href="/dashboard/agency"
              onClick={() => trackAgencyPartner("partner_open_agency", { reason: "enable_first" })}
            >
              {t("partner.openAgency")}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {!agencyStatus?.isAgency && !agencyStatus?.canEnableAgency && (
        <p className="mb-6 text-sm text-muted-foreground">{t("partner.smbNote")}</p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <Users className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">{t("partner.cardHumans")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("partner.cardHumansBody")}</p>
        </div>
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <Sparkles className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">{t("partner.cardAi")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("partner.cardAiBody")}</p>
        </div>
        <div className="rounded-2xl border border-[#dce9ff] bg-white p-4">
          <Zap className="h-6 w-6 text-accent" />
          <p className="mt-2 text-sm font-bold">{t("partner.cardIndia")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("partner.cardIndiaBody")}</p>
        </div>
      </div>

      {agencyStatus?.isAgency && (
        <DashboardPanel className="mb-6" title={t("partner.manageClients")}>
          <p className="text-sm text-muted-foreground">{t("partner.healthHint")}</p>
          <Button asChild size="sm" className="mt-4 gap-1.5 rounded-xl">
            <Link
              href="/dashboard/agency"
              onClick={() => trackAgencyPartner("partner_open_agency", { reason: "manage" })}
            >
              <Building2 className="h-3.5 w-3.5" />
              {t("partner.openAgency")}
            </Link>
          </Button>
        </DashboardPanel>
      )}

      <DashboardPanel className="mb-6" title={t("partner.metaTitle")}>
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t("partner.metaBody1")}</p>
            <p>{t("partner.metaBody2")}</p>
          </div>
        </div>
      </DashboardPanel>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <DashboardPanel key={step.title} title={`${i + 1}. ${step.title}`}>
            <p className="text-sm text-muted-foreground">{step.body}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {step.links.map((link) => (
                <li key={link.href + link.label}>
                  {link.external ? (
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1 rounded-xl text-xs">
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() =>
                          trackAgencyPartner("partner_step_click", { step: i + 1, href: link.href })
                        }
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm" className="h-8 gap-1 rounded-xl text-xs">
                      <Link
                        href={link.href}
                        onClick={() =>
                          trackAgencyPartner("partner_step_click", { step: i + 1, href: link.href })
                        }
                      >
                        {link.label}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </DashboardPanel>
        ))}
      </div>

      <DashboardPanel className="mt-6" title={t("partner.emailTitle")}>
        <pre className="overflow-x-auto rounded-xl bg-[#f8f9ff] p-4 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
          {emailTemplate}
        </pre>
        <Button type="button" size="sm" variant="outline" className="mt-3 rounded-xl" onClick={copyTemplate}>
          {t("partner.emailCopy")}
        </Button>
      </DashboardPanel>
    </div>
  );
}
