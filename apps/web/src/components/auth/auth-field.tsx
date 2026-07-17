"use client";

import type { InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  error?: string | null;
  labelExtra?: React.ReactNode;
};

export function AuthField({
  label,
  icon: Icon,
  hint,
  error,
  labelExtra,
  id,
  className,
  ...props
}: AuthFieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? (hint ? `${id}-hint` : undefined)}
          className={cn(
            "auth-input h-11 rounded-xl border-border bg-card transition-colors focus-visible:border-accent/40 focus-visible:ring-accent/20",
            Icon && "pl-10",
            error && "border-destructive/50 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
