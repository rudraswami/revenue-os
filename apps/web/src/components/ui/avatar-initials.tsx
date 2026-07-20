import { cn } from "@/lib/utils";

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

const PALETTES = [
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
] as const;

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

export function AvatarInitials({
  name,
  seed,
  className,
  size = "md",
}: {
  name: string;
  /** Stable color when name is a single initial (e.g. phone-based). */
  seed?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const colorKey = seed?.trim() || name;
  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-[11px] font-semibold tracking-wide"
      : size === "lg"
        ? "h-12 w-12 text-sm font-semibold tracking-wide"
        : "h-10 w-10 text-xs font-semibold tracking-wide";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        paletteFor(colorKey),
        sizeClass,
        className,
      )}
      aria-hidden
    >
      {initialsFrom(name)}
    </div>
  );
}
