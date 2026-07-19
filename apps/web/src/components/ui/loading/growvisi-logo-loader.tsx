import { cn } from "@/lib/utils";

const SIZES = {
  xs: 16,
  sm: 24,
  md: 40,
  lg: 56,
} as const;

export type GrowvisiLogoLoaderSize = keyof typeof SIZES;

export function GrowvisiLogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="28" height="28" rx="8" className="fill-accent" />
      <path
        d="M8 14.5C8 11.46 10.46 9 13.5 9h1C17.54 9 20 11.46 20 14.5v3.5a1 1 0 01-1 1h-1.2a.8.8 0 01-.8-.8V16.2a2.2 2.2 0 00-2.2-2.2h-.6a2.2 2.2 0 00-2.2 2.2v2.2a.8.8 0 01-.8.8H9a1 1 0 01-1-1v-3.5z"
        fill="white"
      />
    </svg>
  );
}

export function GrowvisiLogoLoader({
  size = "md",
  message,
  className,
  fullscreen = false,
}: {
  size?: GrowvisiLogoLoaderSize;
  message?: string;
  className?: string;
  /** Center in viewport with optional message — auth bootstrap, guards */
  fullscreen?: boolean;
}) {
  const px = SIZES[size];

  const mark = (
    <div
      className={cn("gv-logo-loader inline-flex shrink-0", className)}
      role="status"
      aria-live="polite"
      aria-label={message ?? "Loading"}
    >
      <GrowvisiLogoMark size={px} />
    </div>
  );

  if (!fullscreen) return mark;

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-5",
        fullscreen && "surface-lavender",
      )}
    >
      {mark}
      {message ? (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}
