"use client";

import { HelpCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";

const FAQ_IDS = [
  "how-connect",
  "which-option",
  "before-connect",
  "test-message",
  "multi-number",
] as const;

export function WhatsappOnboardingFaq() {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-[#dce9ff] bg-[#f8f9ff]/40">
      <div className="flex items-center gap-2 border-b border-[#dce9ff] px-4 py-3">
        <HelpCircle className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold text-foreground">{t("whatsappOnboardingFaq.title")}</p>
      </div>
      <div className="divide-y divide-[#dce9ff]/80">
        {FAQ_IDS.map((id) => (
          <details key={id} className="group px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground marker:content-none list-none [&::-webkit-details-marker]:hidden">
              {t(`whatsappOnboardingFaq.items.${id}.q`)}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(`whatsappOnboardingFaq.items.${id}.a`)}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
