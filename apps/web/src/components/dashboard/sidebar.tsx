"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Kanban, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import { logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox, exact: false },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

export function Sidebar() {
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
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border px-5 py-5">
        <Logo href="/dashboard" />
        {organization && (
          <p className="mt-3 truncate text-xs font-medium text-muted-foreground">
            {organization.name}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showUnread = item.href === "/dashboard/inbox" && unread > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              {showUnread && (
                <Badge
                  variant={active ? "outline" : "default"}
                  className={cn(
                    "h-5 min-w-5 justify-center px-1.5 text-[10px]",
                    active && "border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground",
                  )}
                >
                  {unread > 99 ? "99+" : unread}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div
          className={cn(
            "rounded-xl px-3 py-2.5 text-xs font-medium",
            whatsappConnected
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning",
          )}
        >
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
          {whatsappConnected
            ? live
              ? "WhatsApp connected · Live"
              : "WhatsApp connected"
            : "Connect WhatsApp to start"}
        </div>

        {user && (
          <div className="rounded-xl bg-muted/60 px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
