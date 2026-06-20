import {
  Building2,
  Car,
  GraduationCap,
  HeartPulse,
  Paintbrush,
  ShoppingBag,
} from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const industries = [
  {
    icon: Building2,
    title: "Real Estate",
    description: "Track property enquiries from first message to site visit.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    description: "Manage admissions conversations and follow up every applicant.",
  },
  {
    icon: HeartPulse,
    title: "Clinics",
    description: "Handle appointment requests without losing patients in chat.",
  },
  {
    icon: Car,
    title: "Automotive",
    description: "Manage test drives, quotes, and financing questions in one place.",
  },
  {
    icon: Paintbrush,
    title: "Interior Design",
    description: "Track quotations and design discussions through to signed projects.",
  },
  {
    icon: ShoppingBag,
    title: "D2C",
    description: "Manage pre-sales questions and support before and after purchase.",
  },
];

export function IndustryUseCases() {
  return (
    <section id="industries" className="scroll-mt-20 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="section-label">Use cases</p>
          <h2 className="display-lg mt-3 text-foreground">Built for teams that sell on WhatsApp</h2>
        </ScrollReveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((item, i) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={item.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
