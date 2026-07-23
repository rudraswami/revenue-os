"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/locale-provider";

/** Operator billing model — agency pays hub; each client workspace bills separately. */
export function AgencyBillingExplainer() {
  const { t } = useI18n();

  return (
    <div className="mb-6 rounded-2xl border border-border bg-muted/30 px-4 py-4 sm:px-5">
      <div className="flex gap-3">
        <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 space-y-2 text-sm">
          <p className="font-semibold text-foreground">{t("agency.billingTitle")}</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>{t("agency.billingYouPay")}</li>
            <li>{t("agency.billingClientPays")}</li>
            <li>{t("agency.billingInvite")}</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            {t("agency.billingFooter")}{" "}
            <Link href="/dashboard/pricing" className="font-semibold text-accent hover:underline">
              {t("agency.billingPricingLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
