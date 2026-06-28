"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Inbox, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UrgentCounts = {
  unread: number;
  handoffs: number;
  stale: number;
  unassigned: number;
};

const ITEMS = [
  {
    key: "stale" as const,
    label: "Waiting 24h+",
    icon: Clock,
    href: "/dashboard/inbox",
    action: "Respond",
    tone: "border-rose-200 bg-rose-50 text-rose-900",
  },
  {
    key: "unassigned" as const,
    label: "Unassigned",
    icon: AlertTriangle,
    href: "/dashboard/inbox",
    action: "Assign",
    tone: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    key: "handoffs" as const,
    label: "Needs human",
    icon: UserRound,
    href: "/dashboard/inbox?filter=handoff",
    action: "Take over",
    tone: "border-violet-200 bg-violet-50 text-violet-950",
  },
  {
    key: "unread" as const,
    label: "Unread",
    icon: Inbox,
    href: "/dashboard/inbox",
    action: "Reply",
    tone: "border-sky-200 bg-sky-50 text-sky-950",
  },
];

export function HomeUrgentStrip({ counts }: { counts: UrgentCounts }) {
  const active = ITEMS.filter((item) => counts[item.key] > 0);
  const total = active.reduce((n, item) => n + counts[item.key], 0);

  if (active.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/50 p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Action required</p>
          <p className="text-base font-bold text-foreground">
            {total} thread{total === 1 ? "" : "s"} need you today
          </p>
        </div>
        <Button asChild size="sm" className="rounded-xl">
          <Link href="/dashboard/inbox">Open inbox</Link>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {active.map((item, i) => {
          const Icon = item.icon;
          const count = counts[item.key];
          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={item.href}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition hover:shadow-sm ${item.tone}`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="font-bold">{count}</span>
                <span>{item.label}</span>
                <span className="text-xs opacity-70">· {item.action}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
