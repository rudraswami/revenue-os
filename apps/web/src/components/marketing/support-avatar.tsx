import Image from "next/image";
import { cn } from "@/lib/utils";

type SupportAvatarProps = {
  className?: string;
  size?: number;
  /** Tighter crop for the floating action button */
  variant?: "default" | "fab";
};

const AVATAR_SRC = "/marketing/priya-avatar.png";

/** Priya — marketing support agent photo avatar. */
export function SupportAvatar({ className, size = 40, variant = "default" }: SupportAvatarProps) {
  return (
    <Image
      src={AVATAR_SRC}
      alt="Priya from Growvisi"
      width={size}
      height={size}
      className={cn(
        "shrink-0 rounded-full object-cover object-[center_18%]",
        variant === "fab" ? "h-full w-full ring-0" : "ring-2 ring-white shadow-sm",
        className,
      )}
      priority={variant === "fab"}
    />
  );
}
