"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  Inbox,
  Kanban,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Settings,
  Zap,
} from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, exact: false },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban, exact: false },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/dashboard/ai", label: "AI", icon: Bot, exact: false },
  { href: "/dashboard/automations", label: "Automations", icon: Zap, exact: false },
  { href: "/dashboard/insights", label: "Insights", icon: Lightbulb, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

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

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-5 py-5">
        <Logo href="/dashboard" />
        {organization && (
          <p className="mt-3 truncate text-[12px] font-medium text-muted-foreground">
            {organization.name}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 custom-scrollbar">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showUnread = item.href === "/dashboard/inbox" && unread > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
                {item.label}
              </span>
              {showUnread && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-4">
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-[12px] font-medium",
            whatsappConnected ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
          )}
        >
          {whatsappConnected
            ? live
              ? "WhatsApp connected · Live"
              : "WhatsApp connected"
            : "Connect WhatsApp to start"}
        </div>

        {user && (
          <div className="rounded-lg bg-muted px-3 py-2.5">
            <p className="truncate text-[13px] font-medium">{user.name ?? user.email}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-lg text-muted-foreground"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
