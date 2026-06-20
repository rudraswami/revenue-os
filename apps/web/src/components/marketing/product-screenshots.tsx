import { ScrollReveal } from "./scroll-reveal";
import {
  AnalyticsMock,
  AutomationsMock,
  InboxMock,
  IntelligenceMock,
  PipelineMock,
} from "./mocks/product-mocks";

const cards = [
  {
    title: "AI Understands Every Customer Conversation",
    subtitle: "Conversation Intelligence",
    Mock: InboxMock,
  },
  {
    title: "Know Which Leads Deserve Immediate Attention",
    subtitle: "Lead Scoring",
    Mock: IntelligenceMock,
  },
  {
    title: "Move Deals Through A Clear Sales Process",
    subtitle: "Pipeline",
    Mock: PipelineMock,
  },
  {
    title: "Track Conversion Performance And Revenue",
    subtitle: "Analytics",
    Mock: AnalyticsMock,
  },
  {
    title: "Never Miss Another Follow-Up",
    subtitle: "Automation",
    Mock: AutomationsMock,
  },
];

export function ProductScreenshots() {
  return (
    <section id="product" className="scroll-mt-20 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="section-label">Product</p>
          <h2 className="display-lg mt-3 text-foreground">
            Built for revenue teams, not just messaging
          </h2>
        </ScrollReveal>

        <div className="mt-14 space-y-20">
          {cards.map((card, i) => {
            const Mock = card.Mock;
            const reversed = i % 2 === 1;
            return (
              <ScrollReveal key={card.subtitle} delay={0.05}>
                <div
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-14 ${
                    reversed ? "[&>div:first-child]:lg:order-2 [&>div:last-child]:lg:order-1" : ""
                  }`}
                >
                  <div>
                    <p className="text-[13px] font-semibold uppercase tracking-wider text-primary">
                      {card.subtitle}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                      {card.title}
                    </h3>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border shadow-xl ring-1 ring-black/5">
                    <Mock compact />
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
