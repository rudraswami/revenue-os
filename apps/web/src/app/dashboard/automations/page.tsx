"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
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
  impact: string;
}> = [
  {
    id: "welcome",
    icon: MessageCircle,
    title: "Welcome message",
    description: "Greet first-time customers automatically when they message your number.",
    impact: "Faster first impression",
  },
  {
    id: "followup",
    icon: Clock,
    title: "Follow-up reminder",
    description: "Alert your team when a lead hasn't been replied to in 24 hours.",
    impact: "Fewer dropped leads",
  },
  {
    id: "stage",
    icon: Zap,
    title: "Auto stage update",
    description: "Move leads to Qualified when AI detects strong buying intent.",
    impact: "Cleaner pipeline",
  },
  {
    id: "notify",
    icon: Bell,
    title: "Hot lead alert",
    description: "Notify the team when a lead score exceeds 80.",
    impact: "Close faster",
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
      if (organizationId) saveAutomationPreferences(organizationId, next);
      return next;
    });
  }

  const queuedCount = Object.values(toggles).filter(Boolean).length;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Workflows"
        title="Automations"
        description="Configure what Growvisi should do proactively — preferences save now, server execution ships next."
        badge={
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
            Preview
          </span>
        }
        action={
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <Link href="/dashboard/ai">Intelligence</Link>
          </Button>
        }
      />

      <DashboardPanel
        noPadding
        className="mb-8 border-amber-200/60 bg-gradient-to-r from-amber-50 to-white"
        delay={0.05}
      >
        <div className="flex items-start gap-3 p-5 text-sm">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold text-amber-950">Preview mode — {queuedCount} workflow{queuedCount !== 1 ? "s" : ""} queued</p>
            <p className="mt-1 text-[13px] text-amber-900/85">
              Toggles save your intent locally. Connect WhatsApp in Settings so you&apos;re ready when server workflows launch.
            </p>
          </div>
        </div>
      </DashboardPanel>

      {!hydrated ? (
        <div className="space-y-4">
          {automations.map((a) => (
            <div key={a.id} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((auto, i) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <DashboardPanel noPadding className={toggles[auto.id] ? "border-accent/25 ring-1 ring-accent/10" : ""}>
                <div className="flex flex-row items-start gap-4 p-5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      toggles[auto.id] ? "bg-accent text-white" : "bg-[#ecfdf5] text-accent"
                    }`}
                  >
                    <auto.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold">{auto.title}</h3>
                      <span className="rounded-full bg-[#f8f9ff] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {auto.impact}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{auto.description}</p>
                    <p className="mt-2 text-xs font-medium text-accent">
                      {toggles[auto.id] ? "Queued — activates when server workflows ship" : "Off"}
                    </p>
                  </div>
                  <Switch
                    checked={toggles[auto.id]}
                    onCheckedChange={(v) => toggle(auto.id, v)}
                    aria-label={`${auto.title} automation`}
                  />
                </div>
              </DashboardPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
