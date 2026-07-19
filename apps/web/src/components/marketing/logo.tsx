import Link from "next/link";
import { GrowvisiBrandMark, GrowvisiWordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

/**
 * Brand logo — usage guide:
 * - `default` / `light`: mark + word — sidebar, headers, compact UI
 * - `wordmark`: full logo + tagline — marketing, auth hero, wide layouts
 * - `markOnly`: icon alone — favicon contexts, tight spaces
 */
export function Logo({
  className,
  href = "/",
  variant = "default",
  showTagline = false,
}: {
  className?: string;
  href?: string;
  /** `light` = white text on dark panels; `wordmark` = full PNG lockup */
  variant?: "default" | "light" | "wordmark";
  /** Only with default/light — shows tagline under the word */
  showTagline?: boolean;
}) {
  const isLight = variant === "light";
  const isWordmark = variant === "wordmark";

  const inner = isWordmark ? (
    <GrowvisiWordmark height={showTagline ? 48 : 36} />
  ) : (
    <>
      <GrowvisiBrandMark size={28} priority />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "text-[17px] font-bold tracking-[-0.02em]",
            isLight ? "text-white" : "text-foreground",
          )}
        >
          Growvisi
        </span>
        {showTagline ? (
          <span
            className={cn(
              "text-[10px] font-medium leading-tight",
              isLight ? "text-white/65" : "text-muted-foreground",
            )}
          >
            AI Marketing Brain for Smarter Growth
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5",
        isWordmark && "items-start",
        className,
      )}
    >
      {inner}
    </Link>
  );
}
