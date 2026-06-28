"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  Inbox,
  Loader2,
  UserRound,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PRIORITY_BADGE, type TaskPriority, type TaskStatus } from "@/lib/crm";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const AUTO_COLLAPSE_MS = 9000;

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  lead?: { id: string; displayName?: string | null; phone: string } | null;
}

type DockItem =
  | { kind: "task"; id: string; title: string; subtitle?: string; overdue: boolean; dueToday: boolean; priority: TaskPriority }
  | { kind: "inbox"; id: string; title: string; subtitle: string; href: string; urgent: boolean };

function isOverdue(dueAt?: string | null) {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

function isDueToday(dueAt?: string | null) {
  if (!dueAt) return false;
  const d = new Date(dueAt);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function FloatingTasksDock() {
  const pathname = usePathname();
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const manualRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoOpen = useRef(false);

  const hidden = pathname === "/dashboard/inbox" || pathname.startsWith("/dashboard/inbox/");

  const { data: summary } = useQuery({
    queryKey: ["tasks-summary"],
    queryFn: () =>
      apiFetch<{ open: number; dueToday: number; overdue: number; mine: number }>("/tasks/summary", {
        token: token ?? undefined,
      }),
    enabled: !!token && !hidden,
    refetchInterval: 60_000,
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", "mine", "dock"],
    queryFn: () => apiFetch<TaskRow[]>("/tasks?mine=true", { token: token ?? undefined }),
    enabled: !!token && !hidden,
    refetchInterval: 60_000,
  });

  const { data: convStats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{
        unreadMessages: number;
        humanHandoffRecommended: number;
      }>("/conversations/stats", { token: token ?? undefined }),
    enabled: !!token && !hidden,
    staleTime: 30_000,
  });

  const { data: sla } = useQuery({
    queryKey: ["sla-dock"],
    queryFn: () =>
      apiFetch<{ unansweredOver24h: number }>("/conversations/metrics/sla?period=30d", {
        token: token ?? undefined,
      }),
    enabled: !!token && !hidden,
    staleTime: 60_000,
  });

  const [completingId, setCompletingId] = useState<string | null>(null);

  const toggleTask = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ status: "DONE" }),
      }),
    onMutate: (id) => setCompletingId(id),
    onSettled: () => setCompletingId(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["tasks-summary"] });
    },
  });

  const inboxItems: DockItem[] = [];
  const stale = sla?.unansweredOver24h ?? 0;
  const handoffs = convStats?.humanHandoffRecommended ?? 0;
  const unread = convStats?.unreadMessages ?? 0;

  if (stale > 0) {
    inboxItems.push({
      kind: "inbox",
      id: "stale",
      title: `${stale} waiting 24h+`,
      subtitle: "No human reply yet",
      href: "/dashboard/inbox",
      urgent: true,
    });
  }
  if (handoffs > 0) {
    inboxItems.push({
      kind: "inbox",
      id: "handoff",
      title: `${handoffs} need human reply`,
      subtitle: "AI flagged for your team",
      href: "/dashboard/inbox?filter=handoff",
      urgent: true,
    });
  }
  if (unread > 0) {
    inboxItems.push({
      kind: "inbox",
      id: "unread",
      title: `${unread} unread message${unread === 1 ? "" : "s"}`,
      subtitle: "Customers waiting in WhatsApp",
      href: "/dashboard/inbox",
      urgent: unread > 3,
    });
  }

  const taskItems: DockItem[] = (tasks ?? [])
    .filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
    .map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      subtitle: t.lead?.displayName ?? t.lead?.phone ?? undefined,
      overdue: isOverdue(t.dueAt),
      dueToday: isDueToday(t.dueAt),
      priority: t.priority,
    }))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.dueToday !== b.dueToday) return a.dueToday ? -1 : 1;
      return 0;
    });

  const items = [...inboxItems, ...taskItems];
  const pendingCount = items.length;
  const hasUrgent =
    (summary?.overdue ?? 0) > 0 || inboxItems.some((i) => i.kind === "inbox" && i.urgent);

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    if (manualRef.current) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), AUTO_COLLAPSE_MS);
  }, []);

  useEffect(() => {
    if (hidden || pendingCount === 0 || didAutoOpen.current) return;
    didAutoOpen.current = true;
    if (hasUrgent || (summary?.dueToday ?? 0) > 0) {
      setExpanded(true);
      scheduleCollapse();
    }
  }, [hidden, pendingCount, hasUrgent, summary?.dueToday, scheduleCollapse]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    manualRef.current = next;
    if (next) scheduleCollapse();
    else if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }

  if (hidden || !token || pendingCount === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto w-[min(100vw-2.5rem,340px)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgb(11_28_48/0.18)]"
            onMouseEnter={() => {
              if (collapseTimer.current) clearTimeout(collapseTimer.current);
            }}
            onMouseLeave={() => {
              if (expanded && !manualRef.current) scheduleCollapse();
            }}
          >
            <div className="flex items-center justify-between border-b border-border/80 bg-gradient-to-r from-[#f8f9ff] to-white px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Your queue</p>
                <p className="text-sm font-bold">{pendingCount} to do</p>
              </div>
              <Link
                href="/dashboard/tasks"
                className="text-xs font-semibold text-accent hover:underline"
              >
                All tasks
              </Link>
            </div>
            <ul className="max-h-[min(50vh,320px)] overflow-y-auto custom-scrollbar p-2">
              {items.slice(0, 10).map((item, i) => (
                <motion.li
                  key={`${item.kind}-${item.id}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="mb-1"
                >
                  {item.kind === "inbox" ? (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60",
                        item.urgent && "bg-rose-50/60",
                      )}
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                        {item.id === "handoff" ? (
                          <UserRound className="h-4 w-4" />
                        ) : item.id === "stale" ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <Inbox className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted/60">
                      <button
                        type="button"
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground transition hover:border-accent hover:text-accent"
                        disabled={completingId === item.id}
                        onClick={() => toggleTask.mutate(item.id)}
                        aria-label="Mark done"
                      >
                        {completingId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-sm font-medium leading-snug">{item.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                          )}
                          {item.overdue && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600">
                              <AlertCircle className="h-3 w-3" /> Overdue
                            </span>
                          )}
                          {!item.overdue && item.dueToday && (
                            <span className="text-[10px] font-semibold text-amber-700">Due today</span>
                          )}
                          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", PRIORITY_BADGE[item.priority])}>
                            {item.priority.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggleExpanded}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_32px_rgb(11_158_109/0.45)] transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          hasUrgent && !expanded && "animate-pulse",
        )}
        whileTap={{ scale: 0.94 }}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse to-do list" : "Open to-do list"}
      >
        <CheckSquare className="h-6 w-6" strokeWidth={2} />
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
        <ChevronDown
          className={cn(
            "absolute bottom-1 h-3 w-3 opacity-70 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </motion.button>
    </div>
  );
}
