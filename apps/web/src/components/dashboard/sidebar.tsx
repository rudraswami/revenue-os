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
  { href: "/dashboard/inbox", label: "Conversations", icon: Inbox, exact: false },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban, exact: false },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/dashboard/ai", label: "Intelligence", icon: Bot, exact: false },
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
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-[#dce9ff] bg-white/95 backdrop-blur-sm">
      <div className="border-b border-border/80 px-5 py-5">
        <Logo href="/dashboard" />
        {organization && (
          <p className="mt-3 truncate rounded-md bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {organization.name}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 custom-scrollbar">
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
                "relative flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                active
                  ? "nav-item-active shadow-sm"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-3 pl-1">
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
                {item.label}
              </span>
              {showUnread && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white shadow-sm">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2.5 border-t border-border/80 p-4">
        {whatsappConnected ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-[12px] font-medium text-success">
            <span className="relative flex h-2 w-2">
              {live && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            WhatsApp connected{live ? " · Live" : ""}
          </div>
        ) : (
          <Link
            href="/onboarding"
            onClick={onNavigate}
            className="block rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-[12px] font-medium text-warning transition-colors hover:bg-warning/15"
          >
            Connect your WhatsApp number →
          </Link>
        )}

        {user && (
          <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
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
        <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          {" · "}
          <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
        </p>
      </div>
    </aside>
  );
}
