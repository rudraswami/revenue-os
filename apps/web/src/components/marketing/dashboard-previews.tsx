/** Polished dashboard UI previews — Stitch-style, no cartoon app shell */

export function IntelligencePreview() {
  const rows = [
    { name: "Sarah Mitchell", intent: "Purchase intent", stage: "Qualified", time: "2m ago" },
    { name: "Raj Patel", intent: "Scheduling", stage: "Contacted", time: "15m ago" },
    { name: "Emma Chen", intent: "Pricing enquiry", stage: "Proposal", time: "1h ago" },
    { name: "David Okonkwo", intent: "Support", stage: "New", time: "3h ago" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border bg-[#f8f9ff] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Contact</span>
        <span>Intent</span>
        <span>Stage</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0"
        >
          <div>
            <p className="text-[13px] font-semibold">{r.name}</p>
            <p className="text-[11px] text-muted-foreground">{r.time}</p>
          </div>
          <span className="rounded-md bg-[#e5eeff] px-2 py-0.5 text-[11px] font-medium text-accent">
            {r.intent}
          </span>
          <span className="text-[12px] font-medium">{r.stage}</span>
        </div>
      ))}
    </div>
  );
}

export function ScoringPreview() {
  const leads = [
    { name: "Emma Chen", score: 91, bar: 91 },
    { name: "Sarah Mitchell", score: 88, bar: 88 },
    { name: "Raj Patel", score: 72, bar: 72 },
  ];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-white p-4">
      {leads.map((l) => (
        <div key={l.name}>
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold">{l.name}</span>
            <span className="font-bold text-accent">{l.score}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent bar-animate"
              style={{ width: `${l.bar}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PipelinePreview() {
  const stages = [
    { name: "New", count: 24, pct: 100 },
    { name: "Contacted", count: 18, pct: 75 },
    { name: "Qualified", count: 12, pct: 50 },
    { name: "Proposal", count: 8, pct: 33 },
    { name: "Won", count: 5, pct: 21 },
  ];

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="mb-4 text-[12px] font-semibold text-muted-foreground">Pipeline funnel</p>
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <span className="w-20 text-[12px] font-medium">{s.name}</span>
            <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className="flex h-full items-center rounded-md bg-accent/80 px-2 text-[11px] font-semibold text-white bar-animate"
                style={{ width: `${s.pct}%`, minWidth: s.pct > 15 ? "3rem" : undefined }}
              >
                {s.count}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPreview() {
  const bars = [40, 65, 45, 80, 55, 90, 70];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="mb-4 flex gap-6">
        <div>
          <p className="text-[11px] text-muted-foreground">Conversion</p>
          <p className="text-2xl font-bold text-accent">34%</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Pipeline value</p>
          <p className="text-2xl font-bold">₹12.4L</p>
        </div>
      </div>
      <div className="flex h-24 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={days[i]} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-accent/70"
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
