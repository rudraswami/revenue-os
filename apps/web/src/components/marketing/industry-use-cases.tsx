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

/** Icon centers on this ring (viewBox 0–100, matches % positioning). */
const ICON_RING_R = 32;
/** Title labels sit outside the icon ring along the same spoke. */
const LABEL_RING_R = 42;

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(rad),
    y: 50 + radius * Math.sin(rad),
  };
}

function pct(point: { x: number; y: number }) {
  return { left: `${point.x}%`, top: `${point.y}%` };
}

type LabelPlacement = {
  className: string;
  style: React.CSSProperties;
};

/** Anchor labels outward along each spoke — no jagged mixed alignment. */
function labelPlacement(angle: number): LabelPlacement {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  if (sin < -0.85) {
    return {
      className: "text-center",
      style: { transform: "translate(-50%, calc(-100% - 0.65rem))" },
    };
  }
  if (sin > 0.85) {
    return {
      className: "text-center",
      style: { transform: "translate(-50%, 0.65rem)" },
    };
  }
  if (cos > 0) {
    return {
      className: "text-left",
      style: { transform: "translate(0.55rem, -50%)" },
    };
  }
  return {
    className: "text-right",
    style: { transform: "translate(calc(-100% - 0.55rem), -50%)" },
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
  const end = polar(angle, ICON_RING_R);
  return (
    <motion.line
      x1={50}
      y1={50}
      x2={end.x}
      y2={end.y}
      stroke={active ? "url(#orbit-line-active)" : "url(#orbit-line)"}
      strokeWidth={active ? 1.75 : 1}
      strokeLinecap="round"
      initial={reducedMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: active ? 0.95 : 0.28 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.08 }}
    />
  );
}

function IndustryIcon({
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
  const pos = pct(polar(item.angle, ICON_RING_R));

  const orb = (
    <motion.div
      className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-full",
        "bg-gradient-to-br from-[#6cf8bb]/30 to-[#6cf8bb]/8",
        "ring-1 ring-[#6cf8bb]/25",
        active && "ring-2 ring-[#6cf8bb]/60 shadow-[0_0_40px_rgb(108_248_187/0.4)]",
      )}
      animate={
        reducedMotion ? undefined : active ? { scale: 1.1 } : { scale: [1, 1.03, 1] }
      }
      transition={
        active
          ? { type: "spring", stiffness: 420, damping: 26 }
          : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <MarketingIcon name={item.icon} className="h-[1.25rem] w-[1.25rem] text-[#6cf8bb]" strokeWidth={2} />
    </motion.div>
  );

  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={pos}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }}
      onMouseEnter={() => onHover(item.title)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(item.title)}
      onBlur={() => onHover(null)}
    >
      {item.href ? (
        <Link href={item.href} className="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#6cf8bb]/60">
          {orb}
        </Link>
      ) : (
        orb
      )}
    </motion.div>
  );
}

function IndustryLabel({
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
  const pos = pct(polar(item.angle, LABEL_RING_R));
  const placement = labelPlacement(item.angle);

  const inner = (
    <p
      className={cn(
        "text-[13px] font-bold leading-tight text-white transition-colors",
        active && "text-[#6cf8bb]",
      )}
    >
      {item.title}
    </p>
  );

  return (
    <motion.div
      className={cn("group absolute z-10 max-w-[8.5rem]", placement.className)}
      style={{ ...pos, ...placement.style }}
      initial={reducedMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: 0.18 }}
      onMouseEnter={() => onHover(item.title)}
      onMouseLeave={() => onHover(null)}
    >
      {item.href ? (
        <Link href={item.href} className="block outline-none focus-visible:underline">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
  );
}

export function IndustryUseCases() {
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const activeItem = industries.find((i) => i.title === activeTitle);

  return (
    <section
      id="industries"
      className="scroll-mt-20 relative overflow-hidden bg-[#071018] py-16 md:py-24"
    >
      <div className="marketing-aurora pointer-events-none absolute inset-0 opacity-75" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_45%,rgb(0_108_73/0.2),transparent_68%)]" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          light
          label="Industries"
          title="Built for teams that sell on WhatsApp"
          subtitle="Same engine — tuned for how your industry closes."
        />

        {/* Desktop — orbital diagram */}
        <div className="relative mx-auto mt-6 hidden w-full max-w-[700px] overflow-visible px-6 md:block">
          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <linearGradient id="orbit-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6cf8bb" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#6cf8bb" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="orbit-line-active" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6cf8bb" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#6cf8bb" stopOpacity="1" />
                </linearGradient>
              </defs>
              <circle
                cx={50}
                cy={50}
                r={ICON_RING_R}
                fill="none"
                stroke="white"
                strokeOpacity="0.07"
                strokeWidth="0.6"
                strokeDasharray="3 6"
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

            {/* Center hub */}
            <motion.div
              className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
              initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
            >
              <motion.div
                className="flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#128C7E] shadow-[0_0_48px_rgb(0_108_73/0.5)] ring-4 ring-[#071018]"
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        boxShadow: [
                          "0 0 36px rgb(0 108 73/0.4)",
                          "0 0 64px rgb(0 108 73/0.62)",
                          "0 0 36px rgb(0 108 73/0.4)",
                        ],
                      }
                }
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <MessageCircle className="h-6 w-6 text-white" strokeWidth={2} />
                <span className="mt-1 text-[7px] font-bold uppercase tracking-[0.18em] text-white/90">
                  Engine
                </span>
              </motion.div>
            </motion.div>

            {industries.map((item) => (
              <IndustryLabel
                key={`label-${item.title}`}
                item={item}
                active={activeTitle === item.title}
                onHover={setActiveTitle}
                reducedMotion={!!reducedMotion}
              />
            ))}
            {industries.map((item) => (
              <IndustryIcon
                key={`icon-${item.title}`}
                item={item}
                active={activeTitle === item.title}
                onHover={setActiveTitle}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </div>

          {/* Active industry caption */}
          <motion.div
            key={activeItem?.title ?? "default"}
            className="mx-auto mt-6 min-h-[3.25rem] max-w-lg text-center"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {activeItem ? (
              <>
                <p className="text-base font-bold text-white">{activeItem.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/55">{activeItem.example}</p>
                {activeItem.href && (
                  <Link
                    href={activeItem.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#6cf8bb] hover:underline"
                  >
                    Explore solution <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </>
            ) : (
              <p className="text-sm text-white/45">
                Hover an industry to see how Growvisi fits your workflow
              </p>
            )}
          </motion.div>
        </div>

        {/* Mobile — snap ribbon */}
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
          {industries.map((item, i) => (
            <motion.div
              key={item.title}
              className="w-[min(78vw,280px)] shrink-0 snap-center"
              initial={reducedMotion ? false : { opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex flex-col gap-3 rounded-[1.75rem] bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-6 backdrop-blur-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6cf8bb]/15 ring-1 ring-[#6cf8bb]/20">
                    <MarketingIcon name={item.icon} className="h-5 w-5 text-[#6cf8bb]" />
                  </div>
                  <p className="text-base font-bold text-white">{item.title}</p>
                  <p className="text-sm leading-relaxed text-white/55">{item.example}</p>
                  <span className="text-xs font-semibold text-[#6cf8bb]">Explore →</span>
                </Link>
              ) : (
                <div className="flex flex-col gap-3 rounded-[1.75rem] bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-6 backdrop-blur-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#6cf8bb]/15 ring-1 ring-[#6cf8bb]/20">
                    <MarketingIcon name={item.icon} className="h-5 w-5 text-[#6cf8bb]" />
                  </div>
                  <p className="text-base font-bold text-white">{item.title}</p>
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
