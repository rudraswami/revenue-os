"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { SetupHelpPanel } from "@/components/support/setup-help-panel";
import type { HelpFabContext } from "@/lib/setup-help-content";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useShellWhatsappAccounts } from "@/hooks/use-shell-data";

const CONTEXT_OPTIONS: Array<{
  id: HelpFabContext;
  icon: typeof BookOpen;
  href: string;
}> = [
  { id: "onboarding", icon: BookOpen, href: "/dashboard/help?context=onboarding" },
  { id: "connection", icon: MessageCircle, href: "/dashboard/help?context=connection" },
  { id: "general", icon: Sparkles, href: "/dashboard/help?context=general" },
];

export default function HelpPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context");
  const { data: accounts } = useShellWhatsappAccounts();

  const connected = accounts?.some((a) => a.isActive) ?? false;
  const defaultContext: HelpFabContext = connected ? "general" : "onboarding";
  const context: HelpFabContext =
    contextParam === "onboarding" || contextParam === "connection" || contextParam === "general"
      ? contextParam
      : defaultContext;

  return (
    <div className="dashboard-page max-w-3xl">
      <PageHeader
        title={t("helpPage.title")}
        description={t("helpPage.description")}
      />

      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        {CONTEXT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = context === opt.id;
          return (
            <Link
              key={opt.id}
              href={opt.href}
              className={
                active
                  ? "flex items-start gap-2.5 rounded-xl border border-accent/30 bg-bento-mint/60 px-3 py-3"
                  : "flex items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-3 transition hover:border-accent/20 hover:bg-muted/40"
              }
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t(`helpPage.context.${opt.id}.title`)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`helpPage.context.${opt.id}.hint`)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <DashboardPanel className="overflow-hidden p-0">
        <SetupHelpPanel context={context} showHeader={false} />
      </DashboardPanel>

      <div className="mt-6 flex flex-wrap gap-3 text-xs">
        <Link
          href="/dashboard/connection"
          className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
        >
          Connection health
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/dashboard/settings?tab=whatsapp"
          className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-accent"
        >
          WhatsApp settings
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-accent"
        >
          Setup guide
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
