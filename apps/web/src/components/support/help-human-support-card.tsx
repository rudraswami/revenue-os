"use client";

import { Headphones, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { useI18n } from "@/lib/i18n/locale-provider";
import { SETUP_HELP_ESCALATION } from "@/lib/setup-help-content";

export function HelpHumanSupportCard() {
  const { t } = useI18n();

  return (
    <DashboardPanel
      title={t("setupHelp.supportNeedTitle")}
      description={t("setupHelp.supportHours")}
      className="bg-card"
      contentClassName="space-y-3 pt-0"
    >
      <p className="text-sm text-foreground">
        <span className="text-muted-foreground">{t("setupHelp.supportEmailLabel")}: </span>
        <a href={SETUP_HELP_ESCALATION.emailHref} className="font-semibold text-accent hover:underline">
          {SETUP_HELP_ESCALATION.supportEmail}
        </a>
      </p>
      <Button asChild size="sm" className="h-11 w-full gap-2 rounded-xl">
        <a href={SETUP_HELP_ESCALATION.bookCallHref}>
          <Headphones className="h-4 w-4" />
          {t("setupHelp.bookCall")}
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="h-11 w-full gap-2 rounded-xl bg-card">
        <a href={SETUP_HELP_ESCALATION.contactFormHref}>
          <Mail className="h-4 w-4" />
          {t("setupHelp.contactForm")}
        </a>
      </Button>
    </DashboardPanel>
  );
}
