"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type AutomationId,
  DEFAULT_AUTOMATIONS,
  loadAutomationPreferences,
  saveAutomationPreferences,
} from "@/lib/automation-preferences";
import { useAuthStore } from "@/stores/auth-store";
import { Bell, Clock, MessageCircle, Zap } from "lucide-react";

const automations: Array<{
  id: AutomationId;
  icon: typeof MessageCircle;
  title: string;
  description: string;
}> = [
  {
    id: "welcome",
    icon: MessageCircle,
    title: "Welcome message",
    description: "Send an automatic greeting when a new customer messages you for the first time.",
  },
  {
    id: "followup",
    icon: Clock,
    title: "Follow-up reminder",
    description: "Remind your team when a lead hasn't been replied to in 24 hours.",
  },
  {
    id: "stage",
    icon: Zap,
    title: "Auto stage update",
    description: "Move leads to Qualified when AI detects strong buying intent.",
  },
  {
    id: "notify",
    icon: Bell,
    title: "Hot lead alert",
    description: "Notify the team when a lead score exceeds 80.",
  },
];

export default function AutomationsPage() {
  const organizationId = useAuthStore((s) => s.organization?.id);
  const [toggles, setToggles] = useState<Record<AutomationId, boolean>>(DEFAULT_AUTOMATIONS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setToggles(loadAutomationPreferences(organizationId));
    setHydrated(true);
  }, [organizationId]);

  function toggle(id: AutomationId) {
    setToggles((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (organizationId) {
        saveAutomationPreferences(organizationId, next);
      }
      return next;
    });
  }

  const activeCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Automations"
        description={`${activeCount} of ${automations.length} workflows active — preferences saved to your workspace`}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/ai">AI settings</Link>
          </Button>
        }
      />

      {!hydrated ? (
        <div className="space-y-4">
          {automations.map((a) => (
            <div key={a.id} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((auto) => (
            <Card key={auto.id}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <auto.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{auto.title}</CardTitle>
                  <CardDescription className="mt-1">{auto.description}</CardDescription>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={toggles[auto.id]}
                  onClick={() => toggle(auto.id)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    toggles[auto.id] ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      toggles[auto.id] ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </CardHeader>
              <CardContent className="pl-[4.5rem]">
                <p className="text-xs text-muted-foreground">
                  {toggles[auto.id]
                    ? "Active — will run when server workflows are enabled"
                    : "Paused"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Preferences are saved per workspace. Server-side execution coming soon.{" "}
        <Link href="/dashboard/settings" className="text-primary hover:underline">
          Connect WhatsApp
        </Link>{" "}
        to prepare your account.
      </p>
    </div>
  );
}
