import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  variant = "default",
}: {
  className?: string;
  href?: string;
  variant?: "default" | "light";
}) {
  const isLight = variant === "light";
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect width="28" height="28" rx="8" fill={isLight ? "#25D366" : "#006c49"} />
        <path
          d="M8 14.5C8 11.46 10.46 9 13.5 9h1C17.54 9 20 11.46 20 14.5v3.5a1 1 0 01-1 1h-1.2a.8.8 0 01-.8-.8V16.2a2.2 2.2 0 00-2.2-2.2h-.6a2.2 2.2 0 00-2.2 2.2v2.2a.8.8 0 01-.8.8H9a1 1 0 01-1-1v-3.5z"
          fill="white"
        />
      </svg>
      <span
        className={cn(
          "text-[17px] font-bold tracking-[-0.02em]",
          isLight ? "text-white" : "text-foreground",
        )}
      >
        Growvisi
      </span>
    </Link>
  );
}
