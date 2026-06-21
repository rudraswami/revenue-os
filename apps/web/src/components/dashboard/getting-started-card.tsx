"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "growvisi-getting-started-dismissed";

export function GettingStartedCard() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const { data: convStats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ inboundMessages: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const whatsappConnected = accounts?.some((a) => a.isActive) ?? false;
  const firstMessage = (convStats?.inboundMessages ?? 0) > 0;
  const allDone = whatsappConnected && firstMessage;

  if (dismissed || allDone) return null;

  const steps = [
    {
      id: "explore",
      title: "Explore your workspace",
      description: "Browse Inbox, Pipeline, and Insights.",
      done: true,
      href: "/dashboard/inbox",
      action: "Open Inbox",
    },
    {
      id: "whatsapp",
      title: "Connect your WhatsApp number",
      description: "Paste Meta token — auto-detect & connect in one click.",
      done: whatsappConnected,
      href: "/onboarding",
      action: "Start wizard",
    },
    {
      id: "message",
      title: "Verify first inbound message",
      description: "Send a test WhatsApp — we detect it automatically.",
      done: firstMessage,
      href: "/dashboard/inbox",
      action: "Open Inbox",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <motion.div
      className="mb-8 overflow-hidden rounded-2xl border border-[#dce9ff] bg-white shadow-[0_4px_20px_rgb(11_28_48/0.05)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#dce9ff]/80 bg-gradient-to-r from-[#ecfdf5]/60 to-white px-5 py-4">
        <div>
          <p className="text-[15px] font-bold">
            Getting started{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {doneCount} of {steps.length} complete
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
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <ul className="divide-y divide-[#dce9ff]/80">
        {steps.map((step) => (
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
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {!step.done && step.href && (
              <Button asChild variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl">
                <Link href={step.href}>
                  {step.action}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
