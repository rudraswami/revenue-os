"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  type AutomationId,
  DEFAULT_AUTOMATIONS,
  loadAutomationPreferences,
  saveAutomationPreferences,
} from "@/lib/automation-preferences";
import { useAuthStore } from "@/stores/auth-store";
import { Bell, Clock, FlaskConical, MessageCircle, Zap } from "lucide-react";

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

  function toggle(id: AutomationId, enabled: boolean) {
    setToggles((prev) => {
      const next = { ...prev, [id]: enabled };
      if (organizationId) {
        saveAutomationPreferences(organizationId, next);
      }
      return next;
    });
  }

  const queuedCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Workflows"
        title="Automations"
        description="Configure workflows — your preferences are saved and will activate when server execution ships."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/ai">Intelligence settings</Link>
          </Button>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-amber-50/50 px-4 py-3.5 text-sm text-amber-950 shadow-sm">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-medium">Preview mode</p>
          <p className="mt-0.5 text-xs text-amber-900/90">
            Toggles save your intent ({queuedCount} queued) but workflows do not run on the server
            yet. Connect WhatsApp in Settings so you&apos;re ready when automation goes live.
          </p>
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-4">
          {automations.map((a) => (
            <div key={a.id} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((auto) => (
            <Card key={auto.id} className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <auto.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{auto.title}</CardTitle>
                  <CardDescription className="mt-1">{auto.description}</CardDescription>
                </div>
                <Switch
                  checked={toggles[auto.id]}
                  onCheckedChange={(v) => toggle(auto.id, v)}
                  aria-label={`${auto.title} automation`}
                />
              </CardHeader>
              <CardContent className="pl-[4.5rem]">
                <p className="text-xs text-muted-foreground">
                  {toggles[auto.id] ? "Queued — runs when server workflows launch" : "Off"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
