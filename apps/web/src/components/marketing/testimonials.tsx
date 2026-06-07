import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "There is no way without this CRM I could bring in the revenue we're targeting this year. GrowthSync turned WhatsApp chaos into a real sales process.",
    name: "Richard Simmons",
    role: "President, King Invest Solutions",
  },
  {
    quote:
      "AI-suggested replies are not just automation — they propelled our response time and sales by up to 67% last year. Immediate response is the key.",
    name: "Rodrigo Batista",
    role: "Partner & CTO, Benexia",
  },
  {
    quote:
      "Our sales performance increased by 40% with GrowthSync. We're tremendously comfortable using it every day with our WhatsApp customers.",
    name: "Selda Öztürk",
    role: "Founder, Selda Center",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="surface-muted py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            10,000+ teams trust us
          </h2>
          <p className="mt-3 text-muted-foreground">
            Growing businesses use GrowthSync to sell and support on WhatsApp
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm"
            >
              <Quote className="h-8 w-8 text-primary/30" />
              <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground/80">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 border-t border-border pt-4">
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
