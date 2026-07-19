import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_ASSETS } from "./brand-colors";

/** Circular G mark — favicon, sidebar, loaders, compact chrome. */
export function GrowvisiBrandMark({
  size = 32,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={BRAND_ASSETS.mark}
      alt=""
      width={size}
      height={size}
      priority={priority}
      aria-hidden
      className={cn("shrink-0 select-none", className)}
    />
  );
}
