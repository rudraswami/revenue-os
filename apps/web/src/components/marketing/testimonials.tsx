"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "There is no way without this CRM I could think about bringing a million dollars in revenue. That's our target for this year now.",
    name: "Richard Simmons",
    role: "President, King Invest Solutions",
    initials: "RS",
  },
  {
    quote:
      "GrowthSync AI is not just automation — it's the engine that propelled our sales by up to 67% last year. Immediate response is the key to success.",
    name: "Rodrigo Batista",
    role: "Partner & CTO, Benexia",
    initials: "RB",
  },
  {
    quote:
      "Our sales performance increased by 40% with GrowthSync. We're tremendously comfortable using it every day with our WhatsApp customers.",
    name: "Selda Öztürk",
    role: "Founder, Selda Center",
    initials: "SÖ",
  },
];

export function Testimonials() {
  const [active, setActive] = useState(0);
  const t = testimonials[active];

  return (
    <section id="testimonials" className="py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[560px] text-center">
          <h2 className="display-lg text-foreground">100,000+ clients trust us</h2>
        </div>

        <div className="mx-auto mt-16 max-w-[720px]">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="text-center"
            >
              <p className="text-xl font-medium leading-relaxed text-foreground md:text-2xl md:leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-8 flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </footer>
            </motion.blockquote>
          </AnimatePresence>

          <div className="mt-10 flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`View testimonial ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  active === i ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
