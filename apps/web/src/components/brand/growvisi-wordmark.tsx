import { BRAND_ASSETS } from "./brand-colors";
import { cn } from "@/lib/utils";

/** Full GrowVisi wordmark + tagline — marketing, auth hero, wide headers. */
export function GrowvisiWordmark({
  className,
  height = 40,
}: {
  className?: string;
  /** Render height in px; width scales automatically. */
  height?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_ASSETS.wordmark}
      alt="Growvisi — WhatsApp revenue layer for Indian sales teams"
      height={height}
      className={cn("h-auto w-auto max-w-full select-none", className)}
      style={{ height, width: "auto" }}
    />
  );
}
