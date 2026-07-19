"use client";

import { BookOpen, Brain, MessageCircle } from "lucide-react";

const STEPS = [
  {
    icon: BookOpen,
    title: "Add your business knowledge",
    body: "Upload PDF, DOCX, or TXT — or paste pricing, policies, and FAQs. Growvisi indexes them for grounded answers.",
  },
  {
    icon: Brain,
    title: "Growvisi classifies every message",
    body: "Intent, pipeline stage, and handoff flags update automatically — even when your team sends every reply.",
  },
  {
    icon: MessageCircle,
    title: "Your team stays in control",
    body: "Quick replies speed up manual sends in Conversations. Optional guarded auto-send is configured in Automations (Growth plan).",
  },
] as const;

export function IntelligenceKnowledgeExplainer() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        return (
          <li
            key={step.title}
            className="rounded-xl border border-border/70 bg-background/40 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                {index + 1}
              </span>
              <Icon className="h-4 w-4 text-accent" aria-hidden />
              <p className="text-xs font-semibold text-foreground">{step.title}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
