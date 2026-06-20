import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardSection({
  title,
  description,
  icon: Icon,
  iconClassName,
  children,
  id,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-6", className)}>
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary",
              iconClassName,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
