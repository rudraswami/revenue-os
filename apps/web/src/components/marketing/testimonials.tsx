"use client";

import { motion } from "framer-motion";

function HighlightQuote({ text, highlight }: { text: string; highlight: string }) {
  const parts = text.split(highlight);
  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts[0]}
      <span className="font-semibold text-success">{highlight}</span>
      {parts[1]}
    </>
  );
}

const testimonials = [
  {
    quote: "There is no way without this CRM I could think about bringing a million dollars in revenue. That's our target for this year now.",
    highlight: "a million dollars in revenue",
    name: "Richard Simmons",
    role: "President, King Invest Solutions",
    initials: "RS",
    color: "bg-violet-100 text-violet-700",
  },
  {
    quote: "GrowthSync AI is not just automation — it's the engine that propelled our sales by up to 67% last year. Immediate response is the key to success.",
    highlight: "up to 67% last year",
    name: "Rodrigo Batista",
    role: "Partner & CTO, Benexia",
    initials: "RB",
    color: "bg-blue-100 text-blue-700",
  },
  {
    quote: "Our sales performance increased by 40% with GrowthSync. We're tremendously comfortable using it every day with our WhatsApp customers.",
    highlight: "increased by 40%",
    name: "Selda Öztürk",
    role: "Founder, Selda Center",
    initials: "SÖ",
    color: "bg-emerald-100 text-emerald-700",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[560px] text-center">
          <h2 className="display-lg text-foreground">100,000+ clients trust us</h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm"
            >
              <p className="flex-1 text-[14px] leading-relaxed text-foreground/85">
                &ldquo;<HighlightQuote text={t.quote} highlight={t.highlight} />&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${t.color}`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-[13px] font-semibold">{t.name}</p>
                  <p className="text-[12px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
