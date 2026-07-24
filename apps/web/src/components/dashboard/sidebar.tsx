"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthMe } from "@/hooks/use-auth-me";
import { useVisibleRefetchInterval } from "@/hooks/use-visible-refetch-interval";
import {
  BarChart3,
  Bot,
  Building2,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Contact,
  CreditCard,
  HelpCircle,
  Inbox,
  Kanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Megaphone,
  Settings,
  Zap,
} from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { Logo } from "@/components/marketing/logo";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { QUERY_KEYS } from "@/lib/query-config";
import { applySession, logout } from "@/lib/auth-session";
import type { AuthSession, MeResponse } from "@/lib/auth-types";
import { canManageBilling, canManageCampaigns, canViewTeamAnalytics } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { useShellAgencyStatus, useShellWhatsappAccounts } from "@/hooks/use-shell-data";
import { useI18n } from "@/lib/i18n/locale-provider";
import { getQueryClientRef } from "@/lib/query-client-ref";
import { prefetchDashboardRoute } from "@/lib/route-prefetch";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

type NavGroup = {
  labelKey: string;
  items: Array<{
    href: string;
    labelKey: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    exact?: boolean;
    badge?: "unread";
  }>;
};

function buildNavGroups(opts: {
  showAgency: boolean;
  showAutomate: boolean;
  showAnalytics: boolean;
}): NavGroup[] {
  const overviewItems = [
    { href: "/dashboard", labelKey: "nav.home", icon: LayoutDashboard, exact: true },
    ...(opts.showAgency
      ? [{ href: "/dashboard/agency", labelKey: "nav.agency", icon: Building2 }]
      : []),
    ...(opts.showAnalytics
      ? [{ href: "/dashboard/analytics", labelKey: "nav.analytics", icon: BarChart3 }]
      : []),
  ];

  const groups: NavGroup[] = [
    { labelKey: "groups.overview", items: overviewItems },
    {
      labelKey: "groups.engage",
      items: [
        { href: "/dashboard/inbox", labelKey: "nav.conversations", icon: Inbox, badge: "unread" as const },
        { href: "/dashboard/contacts", labelKey: "nav.contacts", icon: Contact },
        { href: "/dashboard/pipeline", labelKey: "nav.pipeline", icon: Kanban },
        { href: "/dashboard/tasks", labelKey: "nav.tasks", icon: CheckSquare },
      ],
    },
    {
      labelKey: "groups.automate",
      items: [
        { href: "/dashboard/campaigns", labelKey: "nav.campaigns", icon: Megaphone },
        { href: "/dashboard/automations", labelKey: "nav.automations", icon: Zap },
      ],
    },
  ];

  return [
    groups[0],
    groups[1],
    ...(opts.showAutomate ? [groups[2]] : []),
  ];
}

const NavLink = memo(function NavLink({
  item,
  label,
  active,
  unread,
  onNavigate,
  onPrefetch,
}: {
  item: {
    href: string;
    exact?: boolean;
    badge?: "unread";
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  };
  label: string;
  active: boolean;
  unread: number;
  onNavigate?: () => void;
  onPrefetch?: (href: string) => void;
}) {
  const showUnread = item.badge === "unread" && unread > 0;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={onPrefetch ? () => onPrefetch(item.href) : undefined}
      onFocus={onPrefetch ? () => onPrefetch(item.href) : undefined}
      prefetch
      className={cn(
        "relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "nav-item-active shadow-sm"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      <span className="flex items-center gap-2.5 pl-1">
        <item.icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.25 : 2} />
        {label}
      </span>
      {showUnread && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white shadow-sm">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
});

function workspaceKindLabel(
  ws: NonNullable<MeResponse["workspaces"]>[number],
  t: (path: string) => string,
  hasAgencyHub: boolean,
) {
  if (ws.kind === "AGENCY") return t("sidebar.agencyHub");
  if (hasAgencyHub && ws.kind === "STANDARD") return t("sidebar.clientWorkspace");
  return t("sidebar.mainWorkspace");
}

function WorkspaceCard({
  organizationName,
  organizationKind,
  workspaces,
  switchingId,
  onSwitch,
}: {
  organizationName: string;
  organizationKind?: string;
  workspaces?: MeResponse["workspaces"];
  switchingId?: string | null;
  onSwitch?: (organizationId: string) => void;
}) {
  const { t } = useI18n();
  const hasMultiple = (workspaces?.length ?? 0) > 1;
  const hasAgencyHub = workspaces?.some((ws) => ws.kind === "AGENCY") ?? false;
  const currentKind =
    workspaces?.find((ws) => ws.isCurrent)?.kind ?? organizationKind;

  const cardBody = (
    <>
      <AvatarInitials name={organizationName} size="sm" className="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{organizationName}</p>
        <p className="text-xs font-medium text-muted-foreground">
          {currentKind === "AGENCY"
            ? t("sidebar.agencyHub")
            : hasAgencyHub
              ? t("sidebar.clientWorkspace")
              : t("sidebar.mainWorkspace")}
        </p>
      </div>
      {hasMultiple ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </>
  );

  return (
    <div className="mx-3 mt-3">
      {hasMultiple ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left elev-1 transition hover:border-accent/25 hover:bg-bento-mint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {cardBody}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[min(100vw-2rem,17rem)]">
            <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("sidebar.switchWorkspace")}
            </p>
            {(() => {
              const hubs = workspaces!.filter((ws) => ws.kind === "AGENCY");
              const clients = workspaces!.filter((ws) => ws.kind !== "AGENCY");
              const sections = [
                { label: t("sidebar.agencyHub"), list: hubs },
                { label: t("sidebar.clientWorkspace"), list: clients },
              ].filter((s) => s.list.length > 0);

              const renderItem = (ws: NonNullable<MeResponse["workspaces"]>[number]) => (
                <DropdownMenuItem
                  key={ws.id}
                  disabled={ws.isCurrent || switchingId === ws.id}
                  onSelect={() => onSwitch?.(ws.id)}
                  className="gap-2"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ws.name}</p>
                    <p className="text-[10px] text-muted-foreground">{workspaceKindLabel(ws, t, hasAgencyHub)}</p>
                  </div>
                  {ws.isCurrent ? (
                    <Check className="ml-auto h-4 w-4 shrink-0 text-accent" aria-label={t("sidebar.current")} />
                  ) : switchingId === ws.id ? (
                    <span className="ml-auto text-xs text-muted-foreground">…</span>
                  ) : null}
                </DropdownMenuItem>
              );

              if (sections.length <= 1) {
                return workspaces!.map(renderItem);
              }
              return sections.map((section) => (
                <div key={section.label}>
                  <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground">{section.label}</p>
                  {section.list.map(renderItem)}
                </div>
              ));
            })()}
            {hasAgencyHub ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/agency" className="gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {t("sidebar.manageClients")}
                  </Link>
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 elev-1">
          {cardBody}
        </div>
      )}
    </div>
  );
}

function UserAccountMenu({
  userName,
  userEmail,
  whatsappConnected,
  showPricing,
  onLogout,
  onNavigate,
}: {
  userName: string;
  userEmail: string;
  whatsappConnected: boolean;
  showPricing: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  function go(href: string) {
    onNavigate?.();
    const [path, hash] = href.split("#");
    if (hash && pathname === path) {
      window.history.replaceState(null, "", href);
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    router.push(href);
  }

  function prefetch(href: string) {
    const path = href.split("#")[0];
    if (path) router.prefetch(path);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <AvatarInitials name={userName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuItem
          onSelect={() => go("/dashboard/settings")}
          onMouseEnter={() => prefetch("/dashboard/settings")}
          onFocus={() => prefetch("/dashboard/settings")}
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          {t("userMenu.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            go(whatsappConnected ? "/dashboard/connection" : "/onboarding")
          }
          onMouseEnter={() => prefetch(whatsappConnected ? "/dashboard/connection" : "/onboarding")}
          onFocus={() => prefetch(whatsappConnected ? "/dashboard/connection" : "/onboarding")}
        >
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          {whatsappConnected ? t("userMenu.connection") : t("conversations.connectWhatsapp")}
        </DropdownMenuItem>
        {showPricing && (
          <DropdownMenuItem
            onSelect={() => go("/dashboard/pricing")}
            onMouseEnter={() => prefetch("/dashboard/pricing")}
            onFocus={() => prefetch("/dashboard/pricing")}
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            {t("userMenu.pricing")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => go("/onboarding")}>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          {t("userMenu.setupGuide")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/dashboard/help")}>
          <Bot className="h-4 w-4 text-muted-foreground" />
          {t("userMenu.help")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={onLogout}
        >
          <LogOut className="h-4 w-4" />
          {t("userMenu.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  // Narrow field selectors — avoid rerendering the always-mounted sidebar when
  // unrelated user/organization fields change during profile syncs.
  const userName = useAuthStore((s) => s.user?.name ?? null);
  const userEmail = useAuthStore((s) => s.user?.email ?? null);
  const role = useAuthStore((s) => s.role);
  const organizationName = useAuthStore((s) => s.organization?.name ?? null);
  const organizationKind = useAuthStore((s) => s.organization?.kind ?? null);
  const { connected: live } = useRealtime();
  const statsPollInterval = useVisibleRefetchInterval(live ? false : 30_000);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const { error: toastError } = useToast();

  const { data: me } = useAuthMe();

  const { data: accounts } = useShellWhatsappAccounts();

  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.conversationQueueStats,
    queryFn: () =>
      apiFetch<{ unreadMessages: number }>("/conversations/stats?scope=queue", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    refetchInterval: statsPollInterval,
  });

  const { data: agencyStatus } = useShellAgencyStatus();

  const showAgency = !!(agencyStatus?.isAgency || agencyStatus?.canEnableAgency);
  const showAutomate = canManageCampaigns(role);
  const showAnalytics = canViewTeamAnalytics(role);
  const navGroups = useMemo(
    () => buildNavGroups({ showAgency, showAutomate, showAnalytics }),
    [showAgency, showAutomate, showAnalytics],
  );

  const whatsappConnected = accounts?.some((a) => a.isActive) ?? false;
  const unread = stats?.unreadMessages ?? 0;
  const displayName = userName ?? userEmail ?? "Account";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const handleRoutePrefetch = useCallback(
    (href: string) => {
      const qc = getQueryClientRef();
      if (!qc) return;
      prefetchDashboardRoute(qc, href, token);
    },
    [token],
  );

  async function switchWorkspace(organizationId: string) {
    if (!token || switchingId) return;
    setSwitchingId(organizationId);
    try {
      const session = await apiFetch<AuthSession>("/auth/switch-organization", {
        method: "POST",
        token,
        body: JSON.stringify({ organizationId }),
      });
      applySession(session);
      onNavigate?.();
      window.location.href = "/dashboard";
    } catch (e) {
      toastError(toUserMessage(e, "Could not switch workspace."));
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border/80 px-5 py-4">
        <Logo href="/dashboard" />
      </div>

      {organizationName && (
        <WorkspaceCard
          organizationName={organizationName}
          organizationKind={organizationKind ?? undefined}
          workspaces={me?.workspaces}
          switchingId={switchingId}
          onSwitch={(id) => void switchWorkspace(id)}
        />
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <p className="mb-1.5 px-3 text-xs font-medium text-muted-foreground/80">
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    label={t(item.labelKey)}
                    active={active}
                    unread={unread}
                    onNavigate={onNavigate}
                    onPrefetch={handleRoutePrefetch}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {userEmail && (
        <div className="space-y-3 border-t border-border/80 p-3">
          <Link
            href="/dashboard/help"
            onClick={() => onNavigate?.()}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition",
              pathname === "/dashboard/help" || pathname.startsWith("/dashboard/help/")
                ? "border-accent/30 bg-bento-mint text-accent"
                : "border-border bg-card text-foreground hover:border-accent/20 hover:bg-muted/50",
            )}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            {t("nav.helpSupport")}
          </Link>

          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("sidebar.appearance")}
            </p>
            <ThemeToggle className="w-full" />
          </div>

          <UserAccountMenu
            userName={displayName}
            userEmail={userEmail}
            whatsappConnected={whatsappConnected}
            showPricing={canManageBilling(role)}
            onLogout={() => void handleLogout()}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </aside>
  );
}
