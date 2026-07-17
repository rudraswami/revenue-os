"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Building2,
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
import { apiFetch } from "@/lib/api-client";
import { applySession, logout } from "@/lib/auth-session";
import type { AuthSession, MeResponse } from "@/lib/auth-types";
import { useAuthStore } from "@/stores/auth-store";
import { useI18n } from "@/lib/i18n/locale-provider";
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

function buildNavGroups(opts: { showAgency: boolean; showPartner: boolean }): NavGroup[] {
  const overviewItems = [
    { href: "/dashboard", labelKey: "nav.home", icon: LayoutDashboard, exact: true },
    ...(opts.showAgency
      ? [{ href: "/dashboard/agency", labelKey: "nav.agency", icon: Building2 }]
      : []),
    // Partner kit is enablement, not a daily job — only after Agency hub is on.
    ...(opts.showPartner
      ? [{ href: "/dashboard/partner", labelKey: "nav.partner", icon: HelpCircle }]
      : []),
  ];

  return [
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
      labelKey: "groups.intelligence",
      items: [
        { href: "/dashboard/analytics", labelKey: "nav.analytics", icon: BarChart3 },
        { href: "/dashboard/ai", labelKey: "nav.intelligence", icon: Bot },
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
}

function NavLink({
  item,
  label,
  active,
  unread,
  onNavigate,
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
}) {
  const showUnread = item.badge === "unread" && unread > 0;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
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
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white shadow-sm">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

function WorkspaceCard({
  organizationName,
  workspaces,
  switchingId,
  onSwitch,
}: {
  organizationName: string;
  workspaces?: MeResponse["workspaces"];
  switchingId?: string | null;
  onSwitch?: (organizationId: string) => void;
}) {
  const hasMultiple = (workspaces?.length ?? 0) > 1;

  return (
    <div className="mx-3 mt-3 rounded-xl border border-border/80 bg-gradient-to-br from-[#f8f9ff] to-white p-3 shadow-[0_1px_8px_rgb(11_28_48/0.04)]">
      <div className="flex items-center gap-3">
        <AvatarInitials name={organizationName} size="sm" className="rounded-lg" />
        <div className="min-w-0 flex-1">
          {hasMultiple ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-1 text-left focus-visible:outline-none"
                >
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {organizationName}
                  </p>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {workspaces!.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    disabled={ws.isCurrent || switchingId === ws.id}
                    onSelect={() => onSwitch?.(ws.id)}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{ws.name}</span>
                    {ws.isCurrent && (
                      <span className="ml-auto text-[10px] font-semibold text-accent">Current</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <p className="truncate text-[13px] font-semibold text-foreground">{organizationName}</p>
          )}
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
        </div>
      </div>
    </div>
  );
}

function UserAccountMenu({
  userName,
  userEmail,
  whatsappConnected,
  onLogout,
  onNavigate,
}: {
  userName: string;
  userEmail: string;
  whatsappConnected: boolean;
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-white px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <AvatarInitials name={userName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{userName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
          </div>
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuItem onSelect={() => go("/dashboard/settings?tab=account")}>
          <Settings className="h-4 w-4 text-muted-foreground" />
          {t("userMenu.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            go(whatsappConnected ? "/dashboard/connection" : "/onboarding")
          }
        >
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          {whatsappConnected ? t("userMenu.connection") : t("conversations.connectWhatsapp")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/dashboard/pricing")}>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          {t("userMenu.pricing")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go("/onboarding")}>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          {t("userMenu.setupGuide")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => go("/dashboard/settings?tab=whatsapp&assist=help")}
        >
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
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const { connected: live } = useRealtime();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiFetch<MeResponse>("/auth/me", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 120_000,
  });

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ unreadMessages: number }>("/conversations/stats", { token: token ?? undefined }),
    enabled: !!token,
    refetchInterval: live ? false : 30_000,
  });

  const { data: agencyStatus } = useQuery({
    queryKey: ["agency-status"],
    queryFn: () =>
      apiFetch<{ isAgency: boolean; canEnableAgency: boolean }>("/agency/status", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 120_000,
  });

  const navGroups = buildNavGroups({
    // Operator (Pro) can discover Agency hub; Partner kit only after hub is enabled.
    showAgency: !!(agencyStatus?.isAgency || agencyStatus?.canEnableAgency),
    showPartner: !!agencyStatus?.isAgency,
  });

  const whatsappConnected = accounts?.some((a) => a.isActive) ?? false;
  const unread = stats?.unreadMessages ?? 0;
  const displayName = user?.name ?? user?.email ?? "Account";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

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
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-[#fafbfc]">
      <div className="border-b border-border/80 px-5 py-4">
        <Logo href="/dashboard" />
      </div>

      {organization && (
        <WorkspaceCard
          organizationName={organization.name}
          workspaces={me?.workspaces}
          switchingId={switchingId}
          onSwitch={(id) => void switchWorkspace(id)}
        />
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
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
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-t border-border/80 p-3">
          <UserAccountMenu
            userName={displayName}
            userEmail={user.email}
            whatsappConnected={whatsappConnected}
            onLogout={() => void handleLogout()}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </aside>
  );
}
