"use client";

import { Cloud, Smartphone } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { WhatsappConnectPath } from "@/lib/whatsapp-connect-paths";
import { cn } from "@/lib/utils";

const ICONS = {
  phone: Smartphone,
  api: Cloud,
} as const;

const PATH_META: Record<
  WhatsappConnectPath,
  { icon: keyof typeof ICONS; i18nKey: string; hasBadge?: boolean }
> = {
  business_app: { icon: "phone", i18nKey: "business_app", hasBadge: true },
  cloud_api: { icon: "api", i18nKey: "cloud_api" },
};

export function WhatsappConnectPathPicker({
  value,
  onChange,
}: {
  value: WhatsappConnectPath;
  onChange: (path: WhatsappConnectPath) => void;
}) {
  const { t } = useI18n();
  const paths: WhatsappConnectPath[] = ["business_app", "cloud_api"];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{t("whatsappConnect.pathQuestion")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("whatsappConnect.pathHint")}</p>
      </div>

      {/* Single column on mobile/tablet; side-by-side only on large screens */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {paths.map((pathId) => {
          const meta = PATH_META[pathId];
          const selected = value === pathId;
          const Icon = ICONS[meta.icon];
          const base = `whatsappConnect.paths.${meta.i18nKey}`;

          return (
            <button
              key={pathId}
              type="button"
              onClick={() => onChange(pathId)}
              className={cn(
                "relative rounded-2xl border p-4 text-left transition-all",
                selected
                  ? "border-accent/50 bg-bento-mint/60 ring-2 ring-accent/20 shadow-sm"
                  : "border-border/80 bg-card hover:border-accent/30 hover:bg-muted",
              )}
            >
              {meta.hasBadge && (
                <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                  {t(`${base}.badge`)}
                </span>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    selected ? "bg-accent text-white" : "bg-bento-mint text-accent",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 pr-8">
                  <p className="text-sm font-bold text-foreground">{t(`${base}.title`)}</p>
                  <p className="mt-0.5 text-xs font-medium text-accent">{t(`${base}.subtitle`)}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {t(`${base}.description`)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
