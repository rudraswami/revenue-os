"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      title: "Connect WhatsApp Business",
      description: "Optional — link the number your customers message today.",
      done: whatsappConnected,
      href: "/dashboard/settings",
      action: "Connect now",
    },
    {
      id: "message",
      title: "Receive your first message",
      description: "Send a test WhatsApp from your phone.",
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
    <Card className="mb-8 overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/60 bg-gradient-to-r from-primary-soft/50 to-transparent pb-4">
        <div>
          <CardTitle className="text-base font-semibold">
            Getting started{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {doneCount} of {steps.length} complete — connect WhatsApp when you&apos;re ready.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss getting started"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-1 bg-border">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="divide-y divide-border">
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "flex items-center justify-between gap-4 px-6 py-4",
                step.done && "bg-success/5",
              )}
            >
              <div className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {!step.done && step.href && (
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1">
                  <Link href={step.href}>
                    {step.action}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
        {!whatsappConnected && (
          <div className="border-t border-border px-6 py-3 text-center">
            <Link href="/onboarding" className="text-xs font-medium text-primary hover:underline">
              Prefer a guided walkthrough? Open setup wizard →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
