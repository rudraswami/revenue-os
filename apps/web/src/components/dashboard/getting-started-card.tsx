"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, CheckCircle2, Circle, Kanban, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { CTA, NAV } from "@/lib/brand-copy";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "growvisi-getting-started-dismissed";

interface OnboardingProgress {
  whatsappConnected: boolean;
  firstInbound: boolean;
  aiClassified: boolean;
  pipelineMoved: boolean;
  completedCount: number;
  totalSteps: number;
  allComplete: boolean;
}

export function GettingStartedCard() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<OnboardingProgress>("/organizations/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (dismissed || !progress || progress.allComplete) return null;

  const steps = [
    {
      id: "whatsapp",
      title: "Connect WhatsApp",
      description: "Link your business number — takes about 2 minutes.",
      done: progress.whatsappConnected,
      href: "/dashboard/connection",
      action: "Connect",
      icon: MessageSquare,
    },
    {
      id: "message",
      title: "Receive first customer message",
      description: "Send a test WhatsApp from your phone to your business line.",
      done: progress.firstInbound,
      href: "/dashboard/inbox",
      action: CTA.openConversations,
      icon: MessageSquare,
    },
    {
      id: "ai",
      title: "See AI classify a lead",
      description: "Open Inbox — intent score and suggested stage on the thread.",
      done: progress.aiClassified,
      href: "/dashboard/inbox",
      action: CTA.openConversations,
      icon: Bot,
    },
    {
      id: "pipeline",
      title: "Move a deal on Pipeline",
      description: "Drag a card to Qualified or Won — your revenue board is live.",
      done: progress.pipelineMoved,
      href: "/dashboard/pipeline",
      action: NAV.pipeline,
      icon: Kanban,
    },
  ];

  const progressPct = Math.round((progress.completedCount / progress.totalSteps) * 100);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <motion.div
      className="mb-8 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_4px_20px_rgb(11_28_48/0.05)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/80 bg-gradient-to-r from-bento-mint/60 to-white px-5 py-4">
        <div>
          <p className="text-[15px] font-bold">
            First 15 minutes{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {progress.completedCount} of {progress.totalSteps} — connect → classify → close
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-1.5 bg-[#e5eeff]">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <ul className="divide-y divide-[#dce9ff]/80">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center justify-between gap-4 px-5 py-4",
                step.done && "bg-[#ecfdf5]/40",
              )}
            >
              <div className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-3.5 w-3.5 text-accent" />
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {!step.done && (
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl">
                  <Link href={step.href}>
                    {step.action}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
