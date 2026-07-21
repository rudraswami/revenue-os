import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Form field standard (Growvisi DS v1). Wraps a label, optional hint, the
 * control, and an error message with consistent spacing and a11y wiring.
 *
 * Usage:
 *   <Field label="Tag name" hint="Shown on contacts" error={err} htmlFor="tag">
 *     <Input id="tag" ... />
 *   </Field>
 */
export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-xs font-medium text-foreground", className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

export function FieldError({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return (
    <p className={cn("text-xs font-medium text-destructive", className)} role="alert" {...props}>
      {children}
    </p>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {hint && <FieldHint>{hint}</FieldHint>}
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}
