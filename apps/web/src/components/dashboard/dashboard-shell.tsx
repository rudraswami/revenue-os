"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { TrialExpiredBanner } from "@/components/dashboard/status-banners";
import { FloatingTasksDock } from "@/components/dashboard/floating-tasks-dock";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isInbox = pathname === "/dashboard/inbox" || pathname.startsWith("/dashboard/inbox/");

  return (
    <div className="flex app-shell">
      {/* Desktop sidebar — fixed column, never scrolls with main */}
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <div className="relative flex h-full w-[280px] flex-col shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              className="absolute right-3 top-4 rounded-lg p-2 text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main column — only this area scrolls */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border/80 bg-white/90 px-4 py-3 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo href="/dashboard" />
          <div className="w-9" />
        </header>

        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            isInbox ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain",
          )}
        >
          <TrialExpiredBanner />
          {children}
          <FloatingTasksDock />
        </main>
      </div>
    </div>
  );
}
