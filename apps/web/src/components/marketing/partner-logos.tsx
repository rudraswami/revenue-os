function LogoMark({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-8 items-center justify-center grayscale opacity-40 transition-all hover:grayscale-0 hover:opacity-70 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

const partners = [
  {
    name: "Shopify",
    svg: (
      <svg viewBox="0 0 120 32" className="h-7 w-auto" aria-label="Shopify">
        <text x="0" y="24" fill="currentColor" className="text-[22px] font-bold tracking-tight">
          shopify
        </text>
      </svg>
    ),
  },
  {
    name: "Razorpay",
    svg: (
      <svg viewBox="0 0 110 32" className="h-7 w-auto" aria-label="Razorpay">
        <text x="0" y="24" fill="currentColor" className="text-[20px] font-bold">
          Razorpay
        </text>
      </svg>
    ),
  },
  {
    name: "HubSpot",
    svg: (
      <svg viewBox="0 0 100 32" className="h-7 w-auto" aria-label="HubSpot">
        <text x="0" y="24" fill="currentColor" className="text-[20px] font-bold">
          HubSpot
        </text>
      </svg>
    ),
  },
  {
    name: "Zendesk",
    svg: (
      <svg viewBox="0 0 100 32" className="h-7 w-auto" aria-label="Zendesk">
        <text x="0" y="24" fill="currentColor" className="text-[20px] font-semibold">
          zendesk
        </text>
      </svg>
    ),
  },
  {
    name: "Intercom",
    svg: (
      <svg viewBox="0 0 110 32" className="h-7 w-auto" aria-label="Intercom">
        <text x="0" y="24" fill="currentColor" className="text-[20px] font-bold">
          intercom
        </text>
      </svg>
    ),
  },
  {
    name: "Notion",
    svg: (
      <svg viewBox="0 0 90 32" className="h-7 w-auto" aria-label="Notion">
        <text x="0" y="24" fill="currentColor" className="text-[20px] font-bold">
          Notion
        </text>
      </svg>
    ),
  },
];

export function PartnerLogos() {
  return (
    <section className="border-y border-border bg-white py-10">
      <div className="mx-auto max-w-[1120px] px-6">
        <p className="mb-8 text-center text-[13px] font-medium text-muted-foreground">
          Integrates with tools your team already uses
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-foreground">
          {partners.map((p) => (
            <LogoMark key={p.name}>{p.svg}</LogoMark>
          ))}
        </div>
      </div>
    </section>
  );
}
