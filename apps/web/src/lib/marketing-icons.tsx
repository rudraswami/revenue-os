"use client";

import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  BrainCircuit,
  Car,
  ChartNoAxesCombined,
  Columns3,
  GraduationCap,
  HandHelping,
  IndianRupee,
  Landmark,
  MessagesSquare,
  Network,
  Palette,
  PlugZap,
  Stethoscope,
  Store,
} from "lucide-react";

/** Serializable icon keys — safe to pass from Server Components */
export const MARKETING_ICON_NAMES = [
  "messages-square",
  "brain-circuit",
  "columns-3",
  "chart-no-axes-combined",
  "bell-ring",
  "plug-zap",
  "hand-helping",
  "indian-rupee",
  "landmark",
  "graduation-cap",
  "stethoscope",
  "store",
  "network",
  "car",
  "palette",
] as const;

export type MarketingIconName = (typeof MARKETING_ICON_NAMES)[number];

export const MARKETING_ICONS: Record<MarketingIconName, LucideIcon> = {
  "messages-square": MessagesSquare,
  "brain-circuit": BrainCircuit,
  "columns-3": Columns3,
  "chart-no-axes-combined": ChartNoAxesCombined,
  "bell-ring": BellRing,
  "plug-zap": PlugZap,
  "hand-helping": HandHelping,
  "indian-rupee": IndianRupee,
  landmark: Landmark,
  "graduation-cap": GraduationCap,
  stethoscope: Stethoscope,
  store: Store,
  network: Network,
  car: Car,
  palette: Palette,
};

export function MarketingIcon({
  name,
  className,
  strokeWidth = 1.75,
}: {
  name: MarketingIconName;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = MARKETING_ICONS[name];
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
