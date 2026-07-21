import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Canonical surface container (Growvisi DS v1).
 *
 * Standard app card: rounded-2xl, 1px border, elev-1 (theme-aware). Use
 * `interactive` for hoverable/clickable cards, and `flat` for nested surfaces
 * that should not cast their own shadow. This is the single source of truth for
 * app surfaces — DashboardPanel composes it.
 */
export function Card({
  className,
  interactive = false,
  flat = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  flat?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground",
        flat ? "elev-0" : "elev-1",
        interactive &&
          "transition-colors duration-150 hover:border-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-border/80 px-5 py-3.5",
        className,
      )}
      {...props}
    />
  );
}
