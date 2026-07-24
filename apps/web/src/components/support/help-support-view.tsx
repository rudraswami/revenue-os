"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { HelpHumanSupportCard } from "@/components/support/help-human-support-card";
import { SetupHelpChat } from "@/components/support/setup-help-chat";
import { SetupHelpFaqList } from "@/components/support/setup-help-faq-list";
import { apiFetch } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { setupHelpForContext, type HelpFabContext } from "@/lib/setup-help-content";
import { useAuthStore } from "@/stores/auth-store";

export function HelpSupportView({ context }: { context: HelpFabContext }) {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);

  const { data: capabilities } = useQuery({
    queryKey: ["support-capabilities"],
    queryFn: () => apiFetch<{ setupHelpLlm: boolean }>("/support/capabilities", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 120_000,
    retry: 1,
  });

  const llmAvailable = capabilities?.setupHelpLlm === true;
  const faqItems = setupHelpForContext(context, t);

  const contextTitle =
    context === "onboarding"
      ? t("helpPage.context.onboarding.title")
      : context === "connection"
        ? t("helpPage.context.connection.title")
        : t("helpPage.context.general.title");

  return (
    <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
      {llmAvailable ? (
        <DashboardPanel
          title={t("helpPage.askAiTitle")}
          description={formatMessage(t("helpPage.askAiDescription"), { topic: contextTitle })}
          className="flex flex-col overflow-hidden p-0 lg:col-span-3"
          contentClassName="flex min-h-0 flex-1 flex-col p-0"
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-bento-mint px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
              <Sparkles className="h-3 w-3" />
              AI
            </span>
          }
        >
          <SetupHelpChat context={context} layout="page" />
        </DashboardPanel>
      ) : null}

      <div className={llmAvailable ? "space-y-6 lg:col-span-2" : "space-y-6 lg:col-span-5"}>
        <DashboardPanel
          title={t("helpPage.faqTitle")}
          description={t("helpPage.faqDescription")}
          contentClassName="pt-1"
        >
          <SetupHelpFaqList items={faqItems} variant="page" />
        </DashboardPanel>

        {!llmAvailable ? (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
            {t("setupHelp.chatOffline")}
          </div>
        ) : null}

        <HelpHumanSupportCard />
      </div>
    </div>
  );
}
