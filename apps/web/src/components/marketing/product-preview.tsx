"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Inbox,
  Kanban,
  MessageSquare,
  MoreHorizontal,
  Search,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "dashboard", label: "Dashboard", icon: MessageSquare },
  { id: "calendar", label: "Calendar", icon: Calendar },
] as const;

type TabId = (typeof tabs)[number]["id"];

function InboxPreview() {
  const chats = [
    { name: "Sarah M.", msg: "Can I get a quote for the premium plan?", time: "2m", unread: 2 },
    { name: "Raj Patel", msg: "Thanks! When can we schedule a call?", time: "15m", unread: 0 },
    { name: "Emma Chen", msg: "Is delivery available in Mumbai?", time: "1h", unread: 1 },
  ];

  return (
    <div className="flex h-full min-h-[320px]">
      <div className="w-[38%] border-r border-border bg-muted/50 p-3">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Search conversations…</span>
        </div>
        {chats.map((c, i) => (
          <div
            key={c.name}
            className={cn(
              "mb-1 rounded-lg px-3 py-2.5 transition-colors",
              i === 0 ? "bg-primary/10 border border-primary/20" : "hover:bg-background",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{c.name}</span>
              <span className="text-[10px] text-muted-foreground">{c.time}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-[11px] text-muted-foreground">{c.msg}</p>
              {c.unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {c.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-1 flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Sarah M.</p>
            <p className="text-[10px] text-success">● Online</p>
          </div>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
            <p className="text-[11px]">Hi! Can I get a quote for the premium plan?</p>
          </div>
          <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
            <p className="text-[11px]">Absolutely! I&apos;ll send pricing details right away.</p>
          </div>
          <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
            <p className="text-[11px]">Perfect, looking forward to it 🙌</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border p-3">
          <div className="flex-1 rounded-full border border-border bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground">
            Type a message…
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Send className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelinePreview() {
  const columns = [
    { title: "New", count: 4, color: "bg-blue-500" },
    { title: "Qualified", count: 3, color: "bg-violet-500" },
    { title: "Proposal", count: 2, color: "bg-amber-500" },
    { title: "Won", count: 5, color: "bg-success" },
  ];

  return (
    <div className="flex h-full min-h-[320px] gap-3 overflow-x-auto p-4 custom-scrollbar">
      {columns.map((col) => (
        <div key={col.title} className="min-w-[140px] flex-1 rounded-xl bg-muted/60 p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", col.color)} />
            <span className="text-xs font-semibold">{col.title}</span>
            <span className="ml-auto rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {col.count}
            </span>
          </div>
          {Array.from({ length: Math.min(col.count, 2) }).map((_, i) => (
            <div key={i} className="mb-2 rounded-lg border border-border bg-background p-2.5 shadow-sm">
              <p className="text-[11px] font-medium">Lead #{col.title[0]}{i + 1}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">+91 98•• •••••</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", col.color)}
                  style={{ width: `${40 + i * 25}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DashboardPreview() {
  const metrics = [
    { label: "Conversations", value: "248", change: "+12%" },
    { label: "Leads", value: "86", change: "+8%" },
    { label: "Win rate", value: "34%", change: "+3%" },
  ];

  return (
    <div className="h-full min-h-[320px] p-5">
      <div className="mb-4 grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-lg font-bold">{m.value}</p>
            <p className="text-[10px] font-medium text-success">{m.change}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="mb-3 text-xs font-semibold">Leads by stage</p>
        <div className="flex items-end gap-2 h-28">
          {[40, 65, 45, 80, 55, 90, 30].map((h, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-primary/80"
                style={{ height: `${h}%` }}
              />
              <span className="text-[8px] text-muted-foreground">
                {["N", "C", "Q", "P", "N", "W", "L"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const events = [
    { day: 1, time: "10:00", title: "Demo call — Acme Co." },
    { day: 2, time: "14:30", title: "Follow-up — Sarah M." },
    { day: 3, time: "11:00", title: "Onboarding — New client" },
  ];

  return (
    <div className="h-full min-h-[320px] p-5">
      <div className="mb-4 flex gap-2">
        {days.map((d, i) => (
          <div
            key={d}
            className={cn(
              "flex-1 rounded-lg py-2 text-center text-[11px] font-medium",
              i === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <div
            key={e.title}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3"
          >
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">{e.time}</p>
            </div>
            <div className="h-8 w-0.5 rounded-full bg-primary" />
            <p className="text-xs font-medium">{e.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const previews: Record<TabId, React.FC> = {
  inbox: InboxPreview,
  pipeline: PipelinePreview,
  dashboard: DashboardPreview,
  calendar: CalendarPreview,
};

export function ProductPreview() {
  const [active, setActive] = useState<TabId>("inbox");
  const Preview = previews[active];

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              active === tab.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="ml-2 text-xs text-muted-foreground">app.growthsync.in</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Preview />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
