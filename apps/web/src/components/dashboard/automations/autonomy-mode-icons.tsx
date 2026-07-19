"use client";

import type { ComponentType } from "react";
import type { ReplyAutonomyMode } from "@growvisi/shared";
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  active?: boolean;
};

/** Human-in-the-loop — inbox & pipeline, no auto-send */
function ManualReplyIcon({ className, active }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-11 w-11", className)}
      aria-hidden
    >
      <rect
        width="48"
        height="48"
        rx="14"
        className={active ? "fill-accent" : "fill-[#e8f0ff]"}
      />
      <path
        d="M14 16h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H18l-4 3v-3a2 2 0 0 1-2-2V18a2 2 0 0 1 2-2Z"
        className={active ? "fill-white/95" : "fill-white"}
        stroke={active ? "#004d34" : "#0b1c30"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="24"
        cy="23"
        r="5"
        className={active ? "fill-accent stroke-white" : "fill-[#006c49] stroke-white"}
        strokeWidth="1.5"
      />
      <path
        d="M22 23h4M24 21v4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** AI drafts — sparkle + message draft */
function DraftAssistIcon({ className, active }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-11 w-11", className)}
      aria-hidden
    >
      <rect
        width="48"
        height="48"
        rx="14"
        className={active ? "fill-accent" : "fill-[#ecfdf5]"}
      />
      <path
        d="M13 15h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12l-3 2.5V29a2 2 0 0 1-2-2V17a2 2 0 0 1 2-2Z"
        className={active ? "fill-white/95" : "fill-white"}
        stroke={active ? "#004d34" : "#006c49"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 20h10M17 24h7"
        stroke={active ? "#006c49" : "#0b1c30"}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M30 12l1.2 2.4 2.6.4-1.9 1.8.4 2.6L30 17.8l-2.3 1.2.4-2.6-1.9-1.8 2.6-.4L30 12Z"
        className={active ? "fill-[#6cf8bb]" : "fill-[#006c49]"}
      />
      <path
        d="M33 26l.8 1.6 1.8.2-1.3 1.2.3 1.8-1.6-.8-.8 1.6-.3-1.8-1.3-1.2 1.8-.2.8-1.6Z"
        className={active ? "fill-white/80" : "fill-[#6cf8bb]"}
        opacity="0.9"
      />
    </svg>
  );
}

/** Guarded WhatsApp auto-reply — send + shield */
function AutoReplyIcon({ className, active }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("h-11 w-11", className)}
      aria-hidden
    >
      <rect
        width="48"
        height="48"
        rx="14"
        className={active ? "fill-[#128C7E]" : "fill-[#dcf8e8]"}
      />
      <path
        d="M14 17h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-10l-3 2.5V29a2 2 0 0 1-2-2V19a2 2 0 0 1 2-2Z"
        className="fill-white"
        stroke={active ? "#075e54" : "#128C7E"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M18 22h8M18 25h5"
        stroke="#128C7E"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M30 14h8v8"
        stroke={active ? "#6cf8bb" : "#006c49"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 22l3-3 5 5"
        stroke={active ? "#6cf8bb" : "#006c49"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="34"
        cy="18"
        r="7"
        className={active ? "fill-accent/20 stroke-[#6cf8bb]" : "fill-[#006c49]/10 stroke-[#006c49]"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

const ICONS: Record<ReplyAutonomyMode, ComponentType<IconProps>> = {
  intel_only: ManualReplyIcon,
  assist: DraftAssistIcon,
  auto_guarded: AutoReplyIcon,
};

export function AutonomyModeIcon({
  mode,
  active = false,
  className,
}: {
  mode: ReplyAutonomyMode;
  active?: boolean;
  className?: string;
}) {
  const Icon = ICONS[mode];
  return <Icon active={active} className={className} />;
}
