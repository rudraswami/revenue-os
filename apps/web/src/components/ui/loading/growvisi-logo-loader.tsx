import { cn } from "@/lib/utils";
import { BRAND_ASSETS } from "@/components/brand/brand-colors";

const SIZES = {
  xs: 16,
  sm: 24,
  md: 40,
  lg: 56,
  xl: 72,
} as const;

export type GrowvisiLogoLoaderSize = keyof typeof SIZES;

/**
 * Static brand mark — use in nav, favicon contexts. For loading states use
 * {@link GrowvisiLogoLoader} instead.
 */
export function GrowvisiLogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={BRAND_ASSETS.mark}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 select-none", className)}
    />
  );
}

/**
 * Razorpay-style animated brand loader — orbiting accent arc + breathing mark.
 * Use for page loads, auth bootstrap, and inline busy states.
 */
export function GrowvisiLogoLoader({
  size = "md",
  message,
  className,
  fullscreen = false,
  /** When false, skips the orbit ring (e.g. inside small buttons). */
  showOrbit = true,
}: {
  size?: GrowvisiLogoLoaderSize;
  message?: string;
  className?: string;
  /** Center in viewport with optional message — auth bootstrap, guards */
  fullscreen?: boolean;
  showOrbit?: boolean;
}) {
  const px = SIZES[size];
  const orbitPad = showOrbit ? Math.max(6, Math.round(px * 0.22)) : 0;
  const box = px + orbitPad * 2;

  const mark = (
    <div
      className={cn("gv-logo-loader-root inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: box, height: box }}
      role="status"
      aria-live="polite"
      aria-label={message ?? "Loading"}
    >
      {showOrbit ? (
        <svg
          className="gv-logo-loader-orbit pointer-events-none absolute"
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          aria-hidden
        >
          <circle
            cx={box / 2}
            cy={box / 2}
            r={px / 2 + orbitPad * 0.55}
            fill="none"
            stroke="currentColor"
            strokeWidth={Math.max(1.5, px * 0.045)}
            strokeLinecap="round"
            className="text-accent/70"
            pathLength={100}
          />
        </svg>
      ) : null}
      <div className={cn("relative z-[1]", showOrbit ? "gv-logo-loader" : "gv-logo-loader-compact")}>
        <GrowvisiLogoMark size={px} />
      </div>
    </div>
  );

  if (!fullscreen) return mark;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 surface-lavender">
      {mark}
      {message ? (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

/** Tiny inline spinner — drop-in replacement for Loader2 in buttons and tiles. */
export function GrowvisiSpinner({
  size = "xs",
  className,
}: {
  size?: GrowvisiLogoLoaderSize;
  className?: string;
}) {
  return <GrowvisiLogoLoader size={size} showOrbit={false} className={className} />;
}
