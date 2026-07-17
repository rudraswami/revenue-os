import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", key: "dashboard" },
  { label: "Inbox", key: "inbox" },
  { label: "Pipeline", key: "pipeline" },
  { label: "Settings", key: "settings" },
];

export function AppShell({
  children,
  className,
  compact,
  activeNav = "inbox",
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  activeNav?: string;
}) {
  return (
    <div className={cn("product-frame flex bg-card", compact ? "min-h-[380px]" : "min-h-[480px]", className)}>
      <aside className="flex w-[168px] shrink-0 flex-col border-r border-border bg-background">
        <div className="border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-accent" />
            <span className="text-sm font-semibold text-foreground">Acme Retail</span>
          </div>
        </div>
        <nav className="flex-1 p-2">
          {navItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "mb-0.5 rounded-lg px-3 py-2 text-sm font-medium",
                activeNav === item.key
                  ? "bg-bento-mint font-semibold text-accent"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-bento-mint" />
            <div>
              <p className="text-xs font-medium">Jane Smith</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function InboxMock({ compact }: { compact?: boolean }) {
  const conversations = [
    { name: "Sarah Mitchell", preview: "Can I get a quote for the premium plan?", time: "2m", unread: 2, active: true },
    { name: "Raj Patel", preview: "Thanks! When can we schedule a call?", time: "15m", unread: 0, active: false },
    { name: "Emma Chen", preview: "Is delivery available in Mumbai?", time: "1h", unread: 1, active: false },
    { name: "David Okonkwo", preview: "We need 50 units by Friday", time: "3h", unread: 0, active: false },
  ];

  return (
    <AppShell compact={compact} activeNav="inbox">
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[220px] shrink-0 flex-col border-r border-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[14px] font-semibold">Inbox</p>
            <p className="text-[11px] text-muted-foreground">3 unread messages</p>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            {conversations.map((c) => (
              <div
                key={c.name}
                className={cn(
                  "mb-1 rounded-lg px-3 py-2.5",
                  c.active ? "bg-bento-mint" : "hover:bg-muted",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.time}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{c.preview}</p>
                  {c.unread > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <p className="text-[14px] font-semibold">Sarah Mitchell</p>
              <p className="text-[11px] text-muted-foreground">+91 98765 43210 · Qualified</p>
            </div>
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">
              Score 82
            </span>
          </div>

          <div className="flex-1 space-y-3 bg-[#fafafa] px-5 py-4">
            <div className="max-w-[72%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 shadow-sm ring-1 ring-border">
              <p className="text-[13px] leading-relaxed">Hi! Can I get a quote for the premium plan?</p>
              <p className="mt-1 text-[10px] text-muted-foreground">10:24 AM</p>
            </div>
            <div className="ml-auto max-w-[72%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-white">
              <p className="text-[13px] leading-relaxed">
                Absolutely! I&apos;ll send pricing details and available delivery slots right away.
              </p>
              <p className="mt-1 text-[10px] text-white/70">10:26 AM</p>
            </div>
            <div className="max-w-[72%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 shadow-sm ring-1 ring-border">
              <p className="text-[13px] leading-relaxed">Perfect. We need it for 50 units by end of month.</p>
              <p className="mt-1 text-[10px] text-muted-foreground">10:27 AM</p>
            </div>
          </div>

          <div className="border-t border-border bg-white px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-full border border-border bg-muted px-4 py-2.5 text-[13px] text-muted-foreground">
                Type a message…
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M12.5 1.5L6.5 7.5M12.5 1.5L8.5 12.5L6.5 7.5M12.5 1.5L1.5 5.5L6.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function DashboardMock({ compact }: { compact?: boolean }) {
  const metrics = [
    { label: "Conversations", value: "248", sub: "12 unread" },
    { label: "Total leads", value: "86", sub: "+8 this week" },
    { label: "Won", value: "29", sub: "34% win rate" },
  ];

  return (
    <AppShell compact={compact} activeNav="dashboard">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold">Home</p>
        <p className="text-[11px] text-muted-foreground">Your WhatsApp sales at a glance</p>
      </div>
      <div className="flex-1 p-5">
        <div className="mb-4 grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-[22px] font-bold tracking-tight">{m.value}</p>
              <p className="mt-0.5 text-[10px] font-medium text-success">{m.sub}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <p className="mb-4 text-[13px] font-semibold">Leads by stage</p>
          <div className="flex h-[120px] items-end gap-2">
            {[32, 48, 40, 72, 56, 88, 24].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${h}%`, opacity: 0.85 + (i % 3) * 0.05 }}
                />
                <span className="text-[9px] font-medium text-muted-foreground">
                  {["New", "Contact", "Qual", "Prop", "Neg", "Won", "Lost"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function PipelineMock({ compact }: { compact?: boolean }) {
  const columns = [
    { name: "New", count: 5, leads: ["Sarah M.", "David O."] },
    { name: "Qualified", count: 3, leads: ["Raj Patel"] },
    { name: "Proposal", count: 2, leads: ["Emma Chen"] },
    { name: "Won", count: 4, leads: ["Alex Kim", "Priya S."] },
  ];

  return (
    <AppShell compact={compact} activeNav="pipeline">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold">Pipeline</p>
        <p className="text-[11px] text-muted-foreground">14 active leads across 7 stages</p>
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden p-4">
        {columns.map((col) => (
          <div key={col.name} className="min-w-[140px] flex-1 rounded-xl bg-muted p-2.5">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="text-[12px] font-semibold">{col.name}</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                {col.count}
              </span>
            </div>
            {col.leads.map((lead) => (
              <div key={lead} className="mb-2 rounded-lg border border-border bg-white p-3 shadow-sm">
                <p className="text-[12px] font-semibold">{lead}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">WhatsApp lead</p>
                <div className="mt-2 h-1 w-full rounded-full bg-muted">
                  <div className="h-full w-3/5 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export function IntelligenceMock({ compact }: { compact?: boolean }) {
  const leads = [
    { name: "Sarah Mitchell", intent: "Purchase intent", score: 88, stage: "Qualified" },
    { name: "Raj Patel", intent: "Scheduling", score: 72, stage: "Contacted" },
    { name: "Emma Chen", intent: "Pricing enquiry", score: 91, stage: "Proposal" },
  ];

  return (
    <AppShell compact={compact} activeNav="inbox">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold">Intelligence</p>
        <p className="text-[11px] text-muted-foreground">AI-classified conversations</p>
      </div>
      <div className="flex-1 space-y-3 p-4">
        {leads.map((lead) => (
          <div key={lead.name} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold">{lead.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{lead.intent}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold",
                  lead.score >= 85 ? "bg-orange-100 text-orange-800" : "bg-primary-soft text-primary",
                )}
              >
                {lead.score}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">{lead.stage}</span>
              <span className="text-[10px] text-success">Auto-updated</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

export function AnalyticsMock({ compact }: { compact?: boolean }) {
  return (
    <AppShell compact={compact} activeNav="dashboard">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold">Analytics</p>
        <p className="text-[11px] text-muted-foreground">Conversion performance</p>
      </div>
      <div className="flex-1 p-4">
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="text-[10px] text-muted-foreground">Conversion rate</p>
            <p className="text-xl font-bold text-primary">34%</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
            <p className="text-[10px] text-muted-foreground">Pipeline value</p>
            <p className="text-xl font-bold">₹12.4L</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
          <p className="mb-3 text-[12px] font-semibold">Funnel</p>
          <div className="space-y-2">
            {[
              { stage: "New", pct: 100 },
              { stage: "Qualified", pct: 62 },
              { stage: "Won", pct: 34 },
            ].map((row) => (
              <div key={row.stage} className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-muted-foreground">{row.stage}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function AutomationsMock({ compact }: { compact?: boolean }) {
  const rules = [
    { name: "24h no-reply follow-up", status: "Active", trigger: "No reply in 24h" },
    { name: "Hot lead alert", status: "Active", trigger: "Score above 80" },
    { name: "Stage auto-update", status: "Active", trigger: "AI qualified intent" },
  ];

  return (
    <AppShell compact={compact} activeNav="settings">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[14px] font-semibold">Automations</p>
        <p className="text-[11px] text-muted-foreground">Never miss a follow-up</p>
      </div>
      <div className="flex-1 space-y-2 p-4">
        {rules.map((rule) => (
          <div key={rule.name} className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold">{rule.name}</p>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                {rule.status}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">When: {rule.trigger}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
