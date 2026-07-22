"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { AutomationPolicyPreset, ReplyAutonomyMode } from "@growvisi/shared";
import { cn } from "@/lib/utils";
import {
  PREVIEW_SCENARIOS,
  type PreviewScenarioId,
  resolvePreviewOutcome,
} from "@/lib/automation-scenarios";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { GitBranch, Loader2, Sparkles } from "lucide-react";

const ACTION_VARIANTS = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-bento-mint text-accent",
  warning: "bg-warning/15 text-warning",
  accent: "bg-accent/10 text-accent",
} as const;

export function ConversationPreview({
  mode,
  preset,
  businessName,
  greetingSample,
  thanksSample,
  syncing = false,
}: {
  mode: ReplyAutonomyMode;
  preset: AutomationPolicyPreset;
  businessName: string;
  greetingSample?: string;
  thanksSample?: string;
  /** True while settings save in background */
  syncing?: boolean;
}) {
  const [scenarioId, setScenarioId] = useState<PreviewScenarioId>("new_lead");
  const reduceMotion = useReducedMotion();

  const scenario = PREVIEW_SCENARIOS.find((s) => s.id === scenarioId)!;
  const outcome = useMemo(
    () =>
      resolvePreviewOutcome(mode, preset, scenarioId, {
        greetingSample,
        thanksSample,
      }),
    [mode, preset, scenarioId, greetingSample, thanksSample],
  );

  const initials = businessName.slice(0, 2).toUpperCase() || "GV";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Live preview</p>
          {syncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Saving" />
          ) : null}
        </div>
        <SegmentedControl
          size="sm"
          aria-label="Preview scenario"
          value={scenarioId}
          onChange={setScenarioId}
          options={PREVIEW_SCENARIOS.map((s) => ({ value: s.id, label: s.label }))}
          className="max-w-full"
        />
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 whatsapp-pattern shadow-inner">
        <div className="flex items-center gap-2.5 border-b border-border/40 bg-whatsapp-header px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">Customer</p>
            <p className="text-[11px] text-white/70">WhatsApp</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <Sparkles className="h-3.5 w-3.5 text-white/80" aria-hidden />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <motion.div
            key={scenarioId}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-whatsapp-green px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
              {scenario.customerMessage}
            </div>

            <div className="flex justify-center">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors duration-150",
                  ACTION_VARIANTS[outcome.action.variant],
                )}
              >
                <Sparkles className="h-3 w-3" aria-hidden />
                {outcome.action.label}
              </span>
            </div>

            {outcome.pipeline ? (
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-opacity duration-150">
                  <GitBranch className="h-3 w-3 text-accent" aria-hidden />
                  Pipeline · {outcome.pipeline}
                </span>
              </div>
            ) : null}

            {outcome.reply && outcome.reply.state !== "none" && outcome.reply.text ? (
              <div className="relative max-w-[88%]">
                <div
                  className={cn(
                    "rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-150",
                    outcome.reply.state === "sent"
                      ? "bg-card text-foreground"
                      : "border border-dashed border-accent/40 bg-white/90 text-foreground",
                  )}
                >
                  {outcome.reply.text}
                </div>
                {outcome.reply.state === "draft" ? (
                  <Badge variant="outline" className="absolute -top-2 right-2 bg-card text-[10px]">
                    Draft · tap Send
                  </Badge>
                ) : outcome.reply.state === "sent" ? (
                  <Badge variant="success" className="absolute -top-2 right-2 text-[10px]">
                    Auto-replied
                  </Badge>
                ) : null}
              </div>
            ) : outcome.reply?.state === "none" ? (
              <p className="text-center text-xs italic text-muted-foreground">
                No reply sent — waiting for your team
              </p>
            ) : null}
          </motion.div>
        </div>

        {outcome.footnote ? (
          <div className="border-t border-border/40 bg-card/60 px-4 py-2.5">
            <p className="text-[11px] leading-relaxed text-muted-foreground">{outcome.footnote}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
