"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CreditCard,
  Key,
  Link2,
  Lock,
  LogOut,
  MessageCircle,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { ApiKeysSettingsCard } from "@/components/settings/api-keys-settings-card";
import { AssignmentRulesCard } from "@/components/settings/assignment-rules-card";
import { BillingSettingsCard } from "@/components/settings/billing-settings-card";
import { BusinessContextCard } from "@/components/settings/business-context-card";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { ProfileSettingsCard } from "@/components/settings/profile-settings-card";
import { ReplyTemplatesCard } from "@/components/settings/reply-templates-card";
import { SettingsSection, SettingsTabLoader } from "@/components/settings/settings-section";
import { TeamMembersCard } from "@/components/settings/team-members-card";
import { AuditActivityCard } from "@/components/settings/audit-activity-card";
import { TrackingLinksCard } from "@/components/settings/tracking-links-card";
import { PaymentIntegrationCard } from "@/components/settings/payment-integration-card";
import { WebhooksSettingsCard } from "@/components/settings/webhooks-settings-card";
import WhatsappConnect from "@/components/settings/whatsapp-connect";
import { WorkspaceOverview, WorkspaceOverviewLinks } from "@/components/settings/workspace-overview";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { apiFetch } from "@/lib/api-client";
import { logout } from "@/lib/auth-session";
import { canManageTeam } from "@/lib/permissions";
import {
  canAccessSettingsTab,
  canAccessSettingsTabRole,
  getDefaultSettingsTab,
  getVisibleSettingsTabs,
  normalizeSettingsTab,
  settingsTabPlanRequirement,
  SETTINGS_ADVANCED_TABS,
  SETTINGS_ESSENTIAL_TABS,
  SETTINGS_HASH_TO_TAB,
  type SettingsAccessContext,
  type SettingsTabId,
} from "@/lib/settings-access";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface SettingsTab {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
}

const TAB_ICONS: Record<SettingsTabId, LucideIcon> = {
  team: Users,
  whatsapp: MessageCircle,
  billing: CreditCard,
  intelligence: BookOpen,
  growth: Link2,
  developers: Key,
  account: User,
};

const TAB_ICON_CLASS: Partial<Record<SettingsTabId, string>> = {
  whatsapp: "bg-[#ecfdf5] text-[#128C7E]",
};

function buildTabMeta(id: SettingsTabId, t: (path: string) => string): SettingsTab {
  return {
    id,
    label: t(`settings.tabs.${id}.label`),
    description: t(`settings.tabs.${id}.description`),
    icon: TAB_ICONS[id],
    iconClassName: TAB_ICON_CLASS[id],
  };
}

function resolveTabFromLocation(search: string, hash: string): SettingsTabId | null {
  const hashKey = hash.replace("#", "");
  if (hashKey && SETTINGS_HASH_TO_TAB[hashKey]) return SETTINGS_HASH_TO_TAB[hashKey];
  return normalizeSettingsTab(new URLSearchParams(search).get("tab"));
}

function settingsTabRoleHint(tab: SettingsTabId): string {
  switch (tab) {
    case "billing":
    case "developers":
      return "owners and admins";
    case "whatsapp":
      return "agents and above";
    case "intelligence":
    case "growth":
      return "managers and above";
    default:
      return "your role";
  }
}

function SettingsAccessPanel({
  tab,
  ctx,
}: {
  tab: SettingsTabId;
  ctx: SettingsAccessContext;
}) {
  const { t } = useI18n();
  const tabLabel = buildTabMeta(tab, t).label;
  const planReq = settingsTabPlanRequirement(tab);
  const roleOk = canAccessSettingsTabRole(tab, ctx.role);

  if (!roleOk) {
    return (
      <SettingsSection>
        <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-4 text-base font-semibold">You don&apos;t have access to this area</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {tabLabel} is limited to {settingsTabRoleHint(tab)}. Ask an owner or admin if
          you need access.
        </p>
        <Button variant="outline" size="sm" className="mt-5 rounded-xl" asChild>
          <Link href="/dashboard/settings">Back to settings</Link>
        </Button>
        </div>
      </SettingsSection>
    );
  }

  if (planReq) {
    const planName = planReq === "growth" ? "Growth" : "Pro";
    return (
      <SettingsSection>
        <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <p className="mt-4 text-base font-semibold">{planName} plan required</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {tabLabel} is included on the {planName} plan and above.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button size="sm" className="rounded-xl" asChild>
            <Link href="/dashboard/pricing">View plans</Link>
          </Button>
          {canAccessSettingsTabRole("billing", ctx.role) && (
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link href="/dashboard/settings?tab=billing">Billing</Link>
            </Button>
          )}
        </div>
        </div>
      </SettingsSection>
    );
  }

  return null;
}

function SettingsTabContent({
  tab,
  isAdmin,
  onLogout,
}: {
  tab: SettingsTabId;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const { t } = useI18n();

  switch (tab) {
    case "team":
      return (
        <div className="space-y-5">
          <SettingsSection
            title="Workspace"
            description="Organization on Growvisi — plan, seats, and your role."
          >
            <WorkspaceOverview />
            <div className="mt-4">
              <WorkspaceOverviewLinks />
            </div>
          </SettingsSection>
          <SettingsSection
            title="Team members"
            description="People with access to this workspace and their roles."
          >
            <TeamMembersCard />
          </SettingsSection>
          {isAdmin ? (
            <SettingsSection
              title="Assignment rules"
              description="Auto-route new conversations and handoffs to the right teammate."
            >
              <AssignmentRulesCard embedded />
            </SettingsSection>
          ) : (
            <p className="text-sm text-muted-foreground">
              Assignment rules are managed by workspace admins.
            </p>
          )}
          {isAdmin ? (
            <SettingsSection
              title="Activity log"
              description="Recent workspace actions — exports, settings, and team changes."
            >
              <AuditActivityCard />
            </SettingsSection>
          ) : null}
        </div>
      );
    case "whatsapp":
      return <WhatsappConnect />;
    case "billing":
      return (
        <SettingsSection
          title="Subscription & usage"
          description="Your plan, seat limits, and Razorpay billing."
          action={
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link href="/dashboard/pricing">View all plans</Link>
            </Button>
          }
        >
          <BillingSettingsCard />
        </SettingsSection>
      );
    case "intelligence":
      return (
        <div className="space-y-5">
          <SettingsSection
            title="Business context"
            description="Pricing, policies, and FAQs — indexed for AI-assisted reply drafts in Conversations."
          >
            <BusinessContextCard embedded />
          </SettingsSection>
          <SettingsSection
            title="Quick replies"
            description="Saved templates your team picks when replying in Conversations."
          >
            <ReplyTemplatesCard embedded />
          </SettingsSection>
        </div>
      );
    case "growth":
      return (
        <div className="space-y-5">
          <SettingsSection
            title="Attribution links"
            description="Track which ads and campaigns drive WhatsApp conversations."
          >
            <TrackingLinksCard />
          </SettingsSection>
          <SettingsSection
            title="Payment → Won"
            description="Connect your Razorpay store so paid customers move to Won automatically."
          >
            <PaymentIntegrationCard />
          </SettingsSection>
        </div>
      );
    case "developers":
      return (
        <SettingsSection
          title="Developer access"
          description="API keys and outbound webhooks for Pro workspaces."
        >
          <ApiKeysSettingsCard />
          <div className="mt-6 border-t border-border/60 pt-5">
            <WebhooksSettingsCard />
          </div>
        </SettingsSection>
      );
    case "account":
      return (
        <div className="space-y-5">
          <SettingsSection
            title={t("settings.account.profileTitle")}
            description={t("settings.account.profileDescription")}
          >
            <ProfileSettingsCard />
          </SettingsSection>
          <SettingsSection title={t("settings.account.sessionTitle")} description={t("settings.account.sessionDescription")}>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild className="rounded-xl">
                <Link href="/onboarding">{t("settings.account.guidedSetup")}</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-muted-foreground"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                {t("settings.account.signOut")}
              </Button>
            </div>
          </SettingsSection>
          <SettingsSection title={t("settings.account.legalTitle")} description={t("settings.account.legalDescription")}>
            <p className="text-sm text-muted-foreground">
              <Link href="/privacy" className="font-medium text-accent underline hover:text-foreground">
                Privacy
              </Link>
              {" · "}
              <Link href="/terms" className="font-medium text-accent underline hover:text-foreground">
                Terms
              </Link>
              {" · "}
              <Link href="/data-deletion" className="font-medium text-accent underline hover:text-foreground">
                Data deletion
              </Link>
              {" · "}
              <Link href="/about" className="font-medium text-accent underline hover:text-foreground">
                How Growvisi works
              </Link>
            </p>
          </SettingsSection>
          <SettingsSection
            title={t("settings.account.dangerTitle")}
            description={t("settings.account.dangerDescription")}
            contentClassName="p-0"
            noPadding
          >
            <div className="p-5">
              <DeleteAccountCard />
            </div>
          </SettingsSection>
        </div>
      );
    default:
      return <SettingsTabLoader />;
  }
}

export function SettingsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);
  const roleReady = !!role;

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: QUERY_KEYS.billing,
    queryFn: () => apiFetch<{ planId: string }>("/billing", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: STALE.config,
    placeholderData: (prev) => prev,
  });

  // Only block the shell on the first billing fetch — not on background refetches.
  const billingReady = !billingLoading || !!billing;
  const shellReady = roleReady && billingReady;

  const accessCtx = useMemo<SettingsAccessContext>(
    () => ({
      role,
      planId: billing?.planId ?? "trial",
    }),
    [role, billing?.planId],
  );

  const visibleTabIds = useMemo(() => getVisibleSettingsTabs(accessCtx), [accessCtx]);
  const visibleTabs = useMemo(
    () => visibleTabIds.map((id) => buildTabMeta(id, t)),
    [visibleTabIds, t],
  );
  const tabById = useMemo(
    () => Object.fromEntries(visibleTabs.map((tab) => [tab.id, tab])) as Record<SettingsTabId, SettingsTab>,
    [visibleTabs],
  );

  const tabFromUrl = normalizeSettingsTab(searchParams.get("tab")) ?? getDefaultSettingsTab(accessCtx);
  const [activeTab, setActiveTab] = useState<SettingsTabId>(tabFromUrl);
  const [tabSwitching, setTabSwitching] = useState(false);

  const syncFromLocation = useCallback(() => {
    const resolved = resolveTabFromLocation(
      window.location.search,
      window.location.hash,
    );
    setActiveTab(resolved ?? getDefaultSettingsTab(accessCtx));
  }, [accessCtx]);

  useEffect(() => {
    syncFromLocation();
    window.addEventListener("hashchange", syncFromLocation);
    return () => window.removeEventListener("hashchange", syncFromLocation);
  }, [syncFromLocation]);

  useEffect(() => {
    const resolved = normalizeSettingsTab(searchParams.get("tab")) ?? getDefaultSettingsTab(accessCtx);
    setActiveTab(resolved);
    setTabSwitching(false);
  }, [searchParams, accessCtx]);

  const current = tabById[activeTab] ?? buildTabMeta(activeTab, t);
  const tabAllowed = canAccessSettingsTab(activeTab, accessCtx);
  const showAccessPanel = !tabAllowed && roleReady;

  function selectTab(id: SettingsTabId) {
    if (!canAccessSettingsTab(id, accessCtx) || id === activeTab) return;
    setTabSwitching(true);
    setActiveTab(id);
    const params = new URLSearchParams(window.location.search);
    if (id === "team") params.delete("tab");
    else params.set("tab", id);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/settings?${qs}` : "/dashboard/settings", { scroll: false });
    requestAnimationFrame(() => setTabSwitching(false));
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Workspace"
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <nav
          className="hidden shrink-0 lg:block lg:w-56"
          aria-label="Settings sections"
        >
          <div className="sticky top-6 space-y-3 rounded-2xl border border-border/80 bg-white p-2 shadow-[0_4px_20px_rgb(11_28_48/0.04)]">
            {[
              { label: t("settings.essentials"), ids: SETTINGS_ESSENTIAL_TABS },
              { label: t("settings.advanced"), ids: SETTINGS_ADVANCED_TABS },
            ].map((group) => {
              const tabs = group.ids
                .filter((id) => visibleTabIds.includes(id))
                .map((id) => tabById[id])
                .filter(Boolean);
              if (tabs.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {tabs.map((tab) => {
                      const active = activeTab === tab.id;
                      return (
                        <li key={tab.id}>
                          <button
                            type="button"
                            onClick={() => selectTab(tab.id)}
                            disabled={!shellReady}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition",
                              active
                                ? "bg-accent/10 text-accent shadow-sm"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                              !shellReady && "pointer-events-none opacity-60",
                            )}
                          >
                            <tab.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                            {tab.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="lg:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {visibleTabs.map((tab) => {
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

          <div className="min-h-[480px]">
            {!shellReady ? (
              <SettingsTabLoader rows={5} />
            ) : showAccessPanel ? (
              <SettingsAccessPanel tab={activeTab} ctx={accessCtx} />
            ) : (
              <div
                className={cn(
                  "transition-opacity duration-150",
                  tabSwitching && "opacity-60",
                )}
              >
                <SettingsTabContent
                  tab={activeTab}
                  isAdmin={isAdmin}
                  onLogout={() => void handleLogout()}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
