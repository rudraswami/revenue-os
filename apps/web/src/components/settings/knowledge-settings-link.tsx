"use client";

import { KNOWLEDGE_SETTINGS_PATH } from "@growvisi/shared";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SETTINGS_KNOWLEDGE_HREF = KNOWLEDGE_SETTINGS_PATH;

export function KnowledgeSettingsLink({
  variant = "inline",
  className,
}: {
  variant?: "inline" | "banner";
  className?: string;
}) {
  if (variant === "banner") {
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
              Add pricing, policies, and FAQs in Settings. Growvisi uses them for drafts and guarded
              auto-replies configured here.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 rounded-xl" asChild>
          <Link href={SETTINGS_KNOWLEDGE_HREF}>
            Manage knowledge
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <Link
      href={SETTINGS_KNOWLEDGE_HREF}
      className={cn("font-semibold text-accent hover:underline", className)}
    >
      Settings → AI & replies
    </Link>
  );
}

export { SETTINGS_KNOWLEDGE_HREF };
