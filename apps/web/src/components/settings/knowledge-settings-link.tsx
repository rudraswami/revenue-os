"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { intelligenceSettingsHref } from "@/lib/intelligence-settings-routes";
import { IntelligenceKnowledgeBanner } from "@/components/settings/intelligence-setup-link";

export function KnowledgeSettingsLink({
  variant = "inline",
  className,
}: {
  variant?: "inline" | "banner";
  className?: string;
}) {
  if (variant === "banner") {
    return <IntelligenceKnowledgeBanner className={className} />;
  }

  return (
    <Link
      href={intelligenceSettingsHref()}
      className={cn("font-semibold text-accent hover:underline", className)}
    >
      Settings → AI &amp; replies
    </Link>
  );
}

export { intelligenceSettingsHref as SETTINGS_KNOWLEDGE_HREF };
