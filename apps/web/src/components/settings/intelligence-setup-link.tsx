"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INTELLIGENCE_INDUSTRY_FRAGMENT,
  intelligenceSettingsHref,
} from "@/lib/intelligence-settings-routes";

export function IntelligenceIndustrySetupLink({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Industry &amp; AI persona</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Sector templates and how Growvisi sounds — configured in Settings, not here.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 rounded-xl" asChild>
        <Link href={intelligenceSettingsHref(INTELLIGENCE_INDUSTRY_FRAGMENT)}>
          Open AI setup
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export function IntelligenceKnowledgeBanner({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <BookOpen className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Business knowledge</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Upload pricing, policies, and FAQs in Settings. Growvisi uses them for drafts and guarded
            auto-replies you configure here.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="shrink-0 rounded-xl" asChild>
        <Link href={intelligenceSettingsHref()}>
          Manage knowledge
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
