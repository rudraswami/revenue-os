import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  compact = false,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-2xl bg-primary-soft text-primary",
            compact ? "h-12 w-12" : "h-14 w-14",
          )}
        >
          {icon}
        </div>
      )}
      <h3 className={cn("font-semibold", compact ? "text-base" : "text-lg")}>{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {action ??
          (actionHref && actionLabel ? (
            <Button asChild size={compact ? "sm" : "default"}>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : null)}
        {secondaryHref && secondaryLabel && (
          <Button asChild variant="outline" size={compact ? "sm" : "default"}>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
