import { cn } from "@/lib/utils";

export type AgencyConnectionStatus = "live" | "setup" | "token" | "disconnected";

const STATUS_CONFIG: Record<
  AgencyConnectionStatus,
  { label: string; className: string }
> = {
  live: {
    label: "Live",
    className: "border-[#6cf8bb]/40 bg-[#ecfdf5] text-[#128C7E]",
  },
  setup: {
    label: "Setup",
    className: "border-amber-200/80 bg-amber-50 text-amber-900",
  },
  token: {
    label: "Token",
    className: "border-red-200/80 bg-red-50 text-red-800",
  },
  disconnected: {
    label: "Not connected",
    className: "border-border/80 bg-muted/40 text-muted-foreground",
  },
};

export function AgencyConnectionBadge({
  status,
  className,
}: {
  status: AgencyConnectionStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
