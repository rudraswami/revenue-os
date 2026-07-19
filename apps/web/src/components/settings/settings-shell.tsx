"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  CreditCard,
  Key,
  LayoutDashboard,
  Link2,
  Lock,
  LogOut,
  MessageCircle,
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
import { IntelligenceKnowledgeExplainer } from "@/components/settings/intelligence-knowledge-explainer";
import { IntelligenceStatusOverview } from "@/components/settings/intelligence-status-overview";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsAccessPanel } from "@/components/settings/settings-plan-gate";
import { SettingsTabSkeleton } from "@/components/settings/settings-tab-skeletons";
import { WorkspaceHome } from "@/components/settings/workspace-home";
import { TeamMembersCard } from "@/components/settings/team-members-card";
import { AuditActivityCard } from "@/components/settings/audit-activity-card";
import { TrackingLinksCard } from "@/components/settings/tracking-links-card";
import { PaymentIntegrationCard } from "@/components/settings/payment-integration-card";
import { PartnerInstallKitSettingsCard } from "@/components/settings/partner-install-kit-card";
import { WebhooksSettingsCard } from "@/components/settings/webhooks-settings-card";
import WhatsappConnect from "@/components/settings/whatsapp-connect";
import { useSettingsBootstrap } from "@/hooks/use-settings-bootstrap";
import type { ShellBootstrapResponse } from "@/lib/shell-bootstrap";
import { logout } from "@/lib/auth-session";
import { canManageTeam } from "@/lib/permissions";
import {
  canAccessSettingsTab,
  canAccessSettingsTabRole,
  getDefaultSettingsTab,
  getVisibleSettingsTabs,
  normalizeSettingsTab,
  settingsTabPlanRequirement,
  SETTINGS_HASH_TO_TAB,
  SETTINGS_NAV_GROUPS,
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
  workspace: LayoutDashboard,
  people: Users,
  whatsapp: MessageCircle,
  billing: CreditCard,
  intelligence: BookOpen,
  growth: Link2,
  developers: Key,
  account: User,
};

const TAB_ICON_CLASS: Partial<Record<SettingsTabId, string>> = {
  whatsapp: "bg-bento-mint text-whatsapp",
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

function SettingsTabContent({
  tab,
  isAdmin,
  onLogout,
  bootstrap,
  bootstrapLoading,
}: {
  tab: SettingsTabId;
  isAdmin: boolean;
  onLogout: () => void;
  bootstrap?: ShellBootstrapResponse;
  bootstrapLoading: boolean;
}) {
  const { t } = useI18n();

  switch (tab) {
    case "workspace":
      return (
        <WorkspaceHome bootstrap={bootstrap} bootstrapLoading={bootstrapLoading} />
      );
    case "people":
      return (
        <div className="space-y-5">
          <SettingsSection
            title="Team members"
            description="People with access to this workspace and their roles."
          >
            <TeamMembersCard />
          </SettingsSection>
          {isAdmin ? (
            <SettingsSection
              id="assignment-rules"
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
            title="How it works"
            description="Business knowledge powers classification and reply drafts. Your team sends customer messages — Growvisi never auto-replies without your Automations policy."
          >
            <IntelligenceKnowledgeExplainer />
          </SettingsSection>
          <SettingsSection
            title="Current setup"
            description="Read-only snapshot. Change reply mode and auto-send presets in Automations."
          >
            <IntelligenceStatusOverview />
          </SettingsSection>
          <SettingsSection
            title="Business knowledge"
            description="Pricing, policies, and FAQs — indexed so Growvisi can draft grounded replies and support guarded auto-send."
          >
            <BusinessContextCard embedded />
          </SettingsSection>
          <SettingsSection
            title="Quick replies"
            description="Saved templates your team picks in Conversations — separate from WhatsApp auto-send."
          >
            <ReplyTemplatesCard embedded />
          </SettingsSection>
        </div>
      );
    case "growth":
      return (
        <div className="space-y-5">
          <PartnerInstallKitSettingsCard />
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
      return <SettingsTabSkeleton tab="workspace" />;
  }
}

export function SettingsShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [isTabPending, startTabTransition] = useTransition();
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);
  const roleReady = !!role;

  const { data: bootstrap, isLoading: bootstrapLoading, isFetching } = useSettingsBootstrap();

  const accessCtx = useMemo<SettingsAccessContext>(
    () => ({
      role,
      planId:
        (bootstrap?.billing as { planId?: string } | undefined)?.planId ??
        bootstrap?.billing?.entitlements?.planId ??
        "trial",
    }),
    [role, bootstrap],
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
  }, [searchParams, accessCtx]);

  const current = tabById[activeTab] ?? buildTabMeta(activeTab, t);
  const tabAllowed = canAccessSettingsTab(activeTab, accessCtx);
  const showAccessPanel = !tabAllowed && roleReady;
  const contentLoading = bootstrapLoading && !bootstrap;
  const showTabSkeleton =
    !roleReady ||
    isTabPending ||
    (contentLoading && activeTab === "workspace");

  function selectTab(id: SettingsTabId) {
    if (!canAccessSettingsTabRole(id, role) || id === activeTab) return;
    startTabTransition(() => {
      setActiveTab(id);
      const params = new URLSearchParams(window.location.search);
      if (id === "workspace") params.delete("tab");
      else params.set("tab", id);
      const qs = params.toString();
      router.replace(qs ? `/dashboard/settings?${qs}` : "/dashboard/settings", { scroll: false });
    });
  }

  function navTabLocked(id: SettingsTabId): boolean {
    const planReq = settingsTabPlanRequirement(id);
    if (!planReq) return false;
    return !canAccessSettingsTab(id, accessCtx);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <nav
          className="hidden shrink-0 lg:block lg:w-56"
          aria-label="Settings sections"
        >
          <div className="sticky top-6 space-y-3 rounded-2xl border border-border/80 bg-card p-2 shadow-[0_4px_20px_rgb(11_28_48/0.04)]">
            {SETTINGS_NAV_GROUPS.map((group) => {
              const tabs = group.tabIds
                .filter((id) => visibleTabIds.includes(id))
                .map((id) => tabById[id])
                .filter(Boolean);
              if (tabs.length === 0) return null;
              return (
                <div key={group.id}>
                  <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                    {t(`settings.groups.${group.id}`)}
                  </p>
                  <ul className="space-y-0.5">
                    {tabs.map((tab) => {
                      const active = activeTab === tab.id;
                      const locked = navTabLocked(tab.id);
                      return (
                        <li key={tab.id}>
                          <button
                            type="button"
                            onClick={() => selectTab(tab.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                              active
                                ? "bg-accent/10 text-accent shadow-sm"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            <tab.icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                            <span className="flex-1 truncate">{tab.label}</span>
                            {locked && (
                              <Lock className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                            )}
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
              const locked = navTabLocked(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors duration-150",
                    active
                      ? "bg-accent/10 text-accent ring-1 ring-accent/15"
                      : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {locked && <Lock className="h-3 w-3 opacity-50" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-start gap-3">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bento-mint text-accent",
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

          <div className="min-h-[640px] w-full">
            {showTabSkeleton ? (
              <SettingsTabSkeleton tab={activeTab} />
            ) : showAccessPanel ? (
              <SettingsAccessPanel
                tab={activeTab}
                tabLabel={current.label}
                tabDescription={current.description}
                ctx={accessCtx}
              />
            ) : (
              <SettingsTabContent
                tab={activeTab}
                isAdmin={isAdmin}
                onLogout={() => void handleLogout()}
                bootstrap={bootstrap}
                bootstrapLoading={bootstrapLoading || isFetching}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
