"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  CreditCard,
  Key,
  Link2,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { ApiKeysSettingsCard } from "@/components/settings/api-keys-settings-card";
import { AssignmentRulesCard } from "@/components/settings/assignment-rules-card";
import { BillingSettingsCard } from "@/components/settings/billing-settings-card";
import { BusinessContextCard } from "@/components/settings/business-context-card";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { ProfileSettingsCard } from "@/components/settings/profile-settings-card";
import { ReplyTemplatesCard } from "@/components/settings/reply-templates-card";
import { TeamMembersCard } from "@/components/settings/team-members-card";
import { TrackingLinksCard } from "@/components/settings/tracking-links-card";
import { WebhooksSettingsCard } from "@/components/settings/webhooks-settings-card";
import { logout } from "@/lib/auth-session";
import { canManageTeam } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const WhatsappConnect = dynamic(() => import("@/components/settings/whatsapp-connect"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-2xl border border-[#dce9ff] bg-[#f8f9ff] p-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      Loading WhatsApp settings…
    </div>
  ),
});

export type SettingsTabId =
  | "workspace"
  | "team"
  | "whatsapp"
  | "billing"
  | "intelligence"
  | "growth"
  | "developers"
  | "account";

interface SettingsTab {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
}

const TABS: SettingsTab[] = [
  {
    id: "workspace",
    label: "Workspace",
    description: "Organization identity on Growvisi.",
    icon: Building2,
  },
  {
    id: "team",
    label: "Team",
    description: "Members, invites, and auto-assignment rules.",
    icon: Users,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Business line, token health, and Meta connection.",
    icon: MessageCircle,
    iconClassName: "bg-[#ecfdf5] text-[#128C7E]",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Plan, usage, and upgrades — INR via Razorpay.",
    icon: CreditCard,
  },
  {
    id: "intelligence",
    label: "AI & replies",
    description: "Business context for RAG and inbox quick replies.",
    icon: BookOpen,
  },
  {
    id: "growth",
    label: "Attribution",
    description: "Tracked click-to-chat links for ads and campaigns.",
    icon: Link2,
  },
  {
    id: "developers",
    label: "Developer",
    description: "API keys and outbound webhooks (Pro).",
    icon: Key,
  },
  {
    id: "account",
    label: "Account",
    description: "Your profile, session, and data controls.",
    icon: User,
  },
];

const HASH_TO_TAB: Record<string, SettingsTabId> = {
  whatsapp: "whatsapp",
  billing: "billing",
  team: "team",
  developers: "developers",
  developer: "developers",
};

function parseTab(raw: string | null): SettingsTabId {
  if (raw && TABS.some((t) => t.id === raw)) return raw as SettingsTabId;
  return "workspace";
}

export function SettingsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organization = useAuthStore((s) => s.organization);
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);

  const tabFromUrl = parseTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<SettingsTabId>(tabFromUrl);

  const syncFromLocation = useCallback(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && HASH_TO_TAB[hash]) {
      setActiveTab(HASH_TO_TAB[hash]);
      return;
    }
    setActiveTab(parseTab(new URLSearchParams(window.location.search).get("tab")));
  }, []);

  useEffect(() => {
    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    return () => window.removeEventListener("hashchange", syncFromLocation);
  }, [syncFromLocation]);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const current = useMemo(
    () => TABS.find((t) => t.id === activeTab) ?? TABS[0],
    [activeTab],
  );

  function selectTab(id: SettingsTabId) {
    setActiveTab(id);
    const params = new URLSearchParams(window.location.search);
    if (id === "workspace") params.delete("tab");
    else params.set("tab", id);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/settings?${qs}` : "/dashboard/settings", { scroll: false });
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Manage your workspace, channels, billing, and integrations — organized by area."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Side nav — desktop */}
        <nav
          className="hidden shrink-0 lg:block lg:w-56"
          aria-label="Settings sections"
        >
          <ul className="sticky top-6 space-y-0.5 rounded-2xl border border-border/80 bg-white p-2 shadow-[0_4px_20px_rgb(11_28_48/0.04)]">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition",
                      active
                        ? "bg-accent/10 text-accent shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Horizontal tabs — mobile */}
        <div className="lg:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition",
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active panel */}
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent",
                current.iconClassName,
              )}
            >
              <current.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{current.label}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{current.description}</p>
            </div>
          </div>

          {activeTab === "workspace" && (
            <DashboardPanel>
              <p className="text-base font-bold">{organization?.name ?? "Your workspace"}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{organization?.slug}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Switch workspaces from the sidebar when you belong to multiple organizations.
              </p>
            </DashboardPanel>
          )}

          {activeTab === "team" && (
            <div className="space-y-6">
              <DashboardPanel>
                <TeamMembersCard />
              </DashboardPanel>
              {isAdmin && (
                <DashboardPanel>
                  <AssignmentRulesCard />
                </DashboardPanel>
              )}
              {!isAdmin && (
                <p className="text-sm text-muted-foreground">
                  Assignment rules are managed by workspace admins.
                </p>
              )}
            </div>
          )}

          {activeTab === "whatsapp" && <WhatsappConnect />}

          {activeTab === "billing" && (
            <DashboardPanel>
              <BillingSettingsCard />
              <Button variant="outline" size="sm" asChild className="mt-4 rounded-xl">
                <Link href="/dashboard/pricing">View all plans</Link>
              </Button>
            </DashboardPanel>
          )}

          {activeTab === "intelligence" && (
            <div className="space-y-6">
              <DashboardPanel>
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BookOpen className="h-4 w-4 text-accent" />
                  Business context
                </div>
                <BusinessContextCard />
              </DashboardPanel>
              <DashboardPanel>
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Mail className="h-4 w-4 text-accent" />
                  Quick replies
                </div>
                <ReplyTemplatesCard />
              </DashboardPanel>
            </div>
          )}

          {activeTab === "growth" && (
            <DashboardPanel>
              <TrackingLinksCard />
            </DashboardPanel>
          )}

          {activeTab === "developers" && (
            <DashboardPanel>
              <ApiKeysSettingsCard />
              <div className="mt-6 border-t border-[#dce9ff] pt-5">
                <WebhooksSettingsCard />
              </div>
            </DashboardPanel>
          )}

          {activeTab === "account" && (
            <DashboardPanel>
              <ProfileSettingsCard />
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" asChild className="rounded-xl">
                  <Link href="/onboarding">Guided WhatsApp setup</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
              <div className="mt-6 border-t border-[#dce9ff] pt-5">
                <p className="mb-3 text-xs text-muted-foreground">
                  <Link href="/privacy" className="underline hover:text-foreground">
                    Privacy
                  </Link>
                  {" · "}
                  <Link href="/terms" className="underline hover:text-foreground">
                    Terms
                  </Link>
                  {" · "}
                  <Link href="/data-deletion" className="underline hover:text-foreground">
                    Data deletion
                  </Link>
                  {" · "}
                  <Link href="/about" className="underline hover:text-foreground">
                    How Growvisi works
                  </Link>
                </p>
                <DeleteAccountCard />
              </div>
            </DashboardPanel>
          )}
        </div>
      </div>
    </div>
  );
}
