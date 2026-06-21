"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  ChevronUp,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Inbox,
  Kanban,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  Settings,
  Shield,
  Zap,
} from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { Logo } from "@/components/marketing/logo";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api-client";
import { logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  badge?: "unread";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Engage",
    items: [
      { href: "/dashboard/inbox", label: "Conversations", icon: Inbox, badge: "unread" },
      { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/ai", label: "Intelligence", icon: Bot },
      { href: "/dashboard/insights", label: "Insights", icon: Lightbulb },
    ],
  },
  {
    label: "Automate",
    items: [{ href: "/dashboard/automations", label: "Automations", icon: Zap }],
  },
];

function NavLink({
  item,
  active,
  unread,
  onNavigate,
}: {
  item: NavItem;
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
        {item.label}
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
  whatsappConnected,
  live,
  onNavigate,
}: {
  organizationName: string;
  whatsappConnected: boolean;
  live: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="mx-3 mt-3 rounded-xl border border-border/80 bg-gradient-to-br from-[#f8f9ff] to-white p-3 shadow-[0_1px_8px_rgb(11_28_48/0.04)]">
      <div className="flex items-center gap-3">
        <AvatarInitials name={organizationName} size="sm" className="rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{organizationName}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        {whatsappConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
            <span className="relative flex h-1.5 w-1.5">
              {live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            WhatsApp live
          </span>
        ) : (
          <Link
            href="/onboarding"
            onClick={onNavigate}
            className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning transition-colors hover:bg-warning/15"
          >
            <MessageCircle className="h-3 w-3" />
            Connect WhatsApp
          </Link>
        )}
      </div>
    </div>
  );
}

function UserAccountMenu({
  userName,
  userEmail,
  organizationName,
  whatsappConnected,
  onLogout,
  onNavigate,
}: {
  userName: string;
  userEmail: string;
  organizationName?: string;
  whatsappConnected: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
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
      <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{userName}</span>
            <span className="text-xs font-normal text-muted-foreground">{userEmail}</span>
            {organizationName && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {organizationName}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" onClick={onNavigate}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={whatsappConnected ? "/dashboard/settings" : "/onboarding"} onClick={onNavigate}>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            {whatsappConnected ? "WhatsApp & channels" : "Connect WhatsApp"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" onClick={onNavigate}>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Billing & plan
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding" onClick={onNavigate}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Setup guide
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Privacy policy
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/60" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Terms of service
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/60" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/data-deletion" target="_blank" rel="noopener noreferrer">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Data deletion
            <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground/60" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const { connected: live } = useRealtime();

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

  const whatsappConnected = accounts?.some((a) => a.isActive) ?? false;
  const unread = stats?.unreadMessages ?? 0;
  const displayName = user?.name ?? user?.email ?? "Account";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-[#fafbfc]">
      <div className="border-b border-border/80 px-5 py-4">
        <Logo href="/dashboard" />
      </div>

      {organization && (
        <WorkspaceCard
          organizationName={organization.name}
          whatsappConnected={whatsappConnected}
          live={live}
          onNavigate={onNavigate}
        />
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 custom-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {group.label}
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
            organizationName={organization?.name}
            whatsappConnected={whatsappConnected}
            onLogout={() => void handleLogout()}
            onNavigate={onNavigate}
          />
        </div>
      )}
    </aside>
  );
}
