"use client";

import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthI18n } from "@/components/auth/auth-i18n";
import { cn } from "@/lib/utils";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  error?: string | null;
  labelExtra?: React.ReactNode;
  showPasswordToggle?: boolean;
  variant?: "default" | "modern";
};

export function AuthField({
  label,
  icon: Icon,
  hint,
  error,
  labelExtra,
  id,
  className,
  type,
  showPasswordToggle,
  variant = "default",
  ...props
}: AuthFieldProps) {
  const { t } = useAuthI18n();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === "password";
  const canToggle = isPassword && showPasswordToggle;
  const inputType = canToggle && visible ? "text" : type;
  const errorId = error && id ? `${id}-error` : undefined;
  const modern = variant === "modern";

  return (
    <div className={cn(modern && "auth-field-modern")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className={cn(
            modern
              ? "text-[13px] font-medium text-foreground/90"
              : "text-sm font-medium text-foreground",
          )}
        >
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="relative">
        {Icon && !modern && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        <Input
          id={id}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId ?? (hint ? `${id}-hint` : undefined)}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            modern
              ? cn(
                  "auth-input-modern h-12 rounded-xl border-0 bg-[#f4f6fa] px-4 text-[15px] shadow-none ring-1 ring-[#e2e8f0] transition-all placeholder:text-[#94a3b8]",
                  focused && "bg-white ring-2 ring-accent/25",
                  error && "ring-destructive/40 bg-red-50/30",
                )
              : cn(
                  "auth-input h-11 rounded-xl border-border bg-card transition-colors focus-visible:border-accent/40 focus-visible:ring-accent/20",
                  Icon && "pl-10",
                ),
            !modern && canToggle && "pr-10",
            modern && canToggle && "pr-11",
            !modern && error && "border-destructive/50 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
            className,
          )}
          {...props}
        />
        {canToggle ? (
          <button
            type="button"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground",
              modern ? "hover:bg-black/5" : "hover:bg-muted",
            )}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
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
