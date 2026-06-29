"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { MarketingIconName } from "@/lib/marketing-icons";
import { MarketingIcon } from "@/lib/marketing-icons";
import { SectionHeader } from "./section-header";
import { cn } from "@/lib/utils";

const industries: Array<{
  icon: MarketingIconName;
  title: string;
  example: string;
  href?: string;
  angle: number;
}> = [
  {
    icon: "landmark",
    title: "Real Estate",
    example: "Plot visits tracked from first WhatsApp ping",
    href: "/solutions/real-estate",
    angle: -90,
  },
  {
    icon: "graduation-cap",
    title: "Education",
    example: "Admission leads scored by intent in Inbox",
    href: "/solutions/education",
    angle: -30,
  },
  {
    icon: "stethoscope",
    title: "Healthcare",
    example: "Appointment requests prioritized on Pipeline",
    href: "/solutions/healthcare",
    angle: 30,
  },
  { icon: "car", title: "Automotive", example: "Test-drive inquiries assigned to sales reps", angle: 90 },
  { icon: "palette", title: "Interior Design", example: "Consultation pipeline with deal ₹ values", angle: 150 },
  {
    icon: "store",
    title: "D2C",
    example: "Campaign click-to-WA attributed to won orders",
    href: "/solutions/d2c",
    angle: 210,
  },
];

const ORBIT_RADIUS = 42;

function polarPosition(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + ORBIT_RADIUS * Math.cos(rad),
    y: 50 + ORBIT_RADIUS * Math.sin(rad),
  };
}

function OrbitLine({
  angle,
  active,
  reducedMotion,
}: {
  angle: number;
  active: boolean;
  reducedMotion: boolean;
}) {
  const end = polarPosition(angle);
  return (
    <motion.line
      x1={50}
      y1={50}
      x2={end.x}
      y2={end.y}
      stroke={active ? "url(#orbit-line-active)" : "url(#orbit-line)"}
      strokeWidth={active ? 2 : 1}
      strokeLinecap="round"
      initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: active ? 0.9 : 0.35 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.1 }}
    />
  );
}

function IndustryNode({
  item,
  active,
  onHover,
  reducedMotion,
}: {
  item: (typeof industries)[0];
  active: boolean;
  onHover: (title: string | null) => void;
  reducedMotion: boolean;
}) {
  const pos = polarPosition(item.angle);
  const content = (
  <>
      <motion.div
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-[#6cf8bb]/25 to-[#6cf8bb]/5 shadow-[0_0_32px_rgb(108_248_187/0.25)]",
          active && "shadow-[0_0_48px_rgb(108_248_187/0.45)]",
        )}
        animate={
          reducedMotion
            ? undefined
            : active
              ? { scale: 1.08 }
              : { scale: [1, 1.04, 1] }
        }
        transition={
          active
            ? { type: "spring", stiffness: 400, damping: 24 }
            : { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <MarketingIcon name={item.icon} className="h-6 w-6 text-[#6cf8bb]" strokeWidth={2} />
        {active && (
          <motion.span
            className="absolute inset-0 rounded-full border border-[#6cf8bb]/50"
            layoutId="industry-ring"
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          />
        )}
      </motion.div>
      <p className="mt-3 text-center text-sm font-bold text-white">{item.title}</p>
      <p
        className={cn(
          "mt-1 max-w-[140px] text-center text-[11px] leading-snug text-white/50 transition-colors",
          active && "text-white/80",
        )}
      >
        {item.example}
      </p>
      {item.href && (
        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#6cf8bb] opacity-0 transition-opacity group-hover:opacity-100">
          Explore <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </>
  );

  const className = "group absolute flex w-[148px] -translate-x-1/2 -translate-y-1/2 flex-col items-center";

  return (
    <motion.div
      className={className}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 22 }}
      onMouseEnter={() => onHover(item.title)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(item.title)}
      onBlur={() => onHover(null)}
    >
      {item.href ? (
        <Link href={item.href} className="flex flex-col items-center outline-none">
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.div>
  );
}

export function IndustryUseCases() {
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="industries"
      className="scroll-mt-20 relative overflow-hidden bg-[#071018] py-20 md:py-28"
    >
      <div className="marketing-aurora pointer-events-none absolute inset-0 opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgb(0_108_73/0.18),transparent_70%)]" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          light
          label="Industries"
          title="Built for teams that sell on WhatsApp"
          subtitle="Same engine — tuned for how your industry closes."
        />

        {/* Desktop — orbital constellation */}
        <div className="relative mx-auto mt-14 hidden aspect-square max-h-[520px] w-full max-w-[520px] md:block">
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <linearGradient id="orbit-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6cf8bb" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#6cf8bb" stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id="orbit-line-active" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6cf8bb" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6cf8bb" stopOpacity="1" />
              </linearGradient>
            </defs>
            <motion.circle
              cx={50}
              cy={50}
              r={ORBIT_RADIUS}
              fill="none"
              stroke="white"
              strokeOpacity="0.06"
              strokeWidth="1"
              strokeDasharray="4 8"
              initial={reducedMotion ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2 }}
            />
            {industries.map((item) => (
              <OrbitLine
                key={item.title}
                angle={item.angle}
                active={activeTitle === item.title}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </svg>

          <motion.div
            className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <motion.div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#128C7E] shadow-[0_0_60px_rgb(0_108_73/0.55)]"
              animate={reducedMotion ? undefined : { boxShadow: ["0 0 40px rgb(0 108 73/0.4)", "0 0 70px rgb(0 108 73/0.65)", "0 0 40px rgb(0 108 73/0.4)"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <MessageCircle className="h-9 w-9 text-white" strokeWidth={2} />
            </motion.div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6cf8bb]">
              Growvisi engine
            </p>
          </motion.div>

          {industries.map((item) => (
            <IndustryNode
              key={item.title}
              item={item}
              active={activeTitle === item.title}
              onHover={setActiveTitle}
              reducedMotion={!!reducedMotion}
            />
          ))}
        </div>

        {/* Mobile — horizontal snap ribbon */}
        <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {industries.map((item, i) => (
            <motion.div
              key={item.title}
              className="w-[min(78vw,280px)] shrink-0 snap-center"
              initial={reducedMotion ? false : { opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex flex-col items-start gap-3 rounded-[2rem] bg-gradient-to-br from-white/[0.08] to-transparent p-6 backdrop-blur-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6cf8bb]/15">
                    <MarketingIcon name={item.icon} className="h-5 w-5 text-[#6cf8bb]" />
                  </div>
                  <p className="text-lg font-bold text-white">{item.title}</p>
                  <p className="text-sm leading-relaxed text-white/55">{item.example}</p>
                  <span className="text-xs font-semibold text-[#6cf8bb]">Explore →</span>
                </Link>
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-[2rem] bg-gradient-to-br from-white/[0.08] to-transparent p-6 backdrop-blur-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6cf8bb]/15">
                    <MarketingIcon name={item.icon} className="h-5 w-5 text-[#6cf8bb]" />
                  </div>
                  <p className="text-lg font-bold text-white">{item.title}</p>
                  <p className="text-sm leading-relaxed text-white/55">{item.example}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
