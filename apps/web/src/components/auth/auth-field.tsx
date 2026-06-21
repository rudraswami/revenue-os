import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  labelExtra?: React.ReactNode;
};

export function AuthField({
  label,
  icon: Icon,
  hint,
  labelExtra,
  id,
  className,
  ...props
}: AuthFieldProps) {
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
          className={cn(
            "auth-input h-11 rounded-xl border-[#dce9ff] bg-[#f8f9ff]/50 transition-colors focus-visible:border-accent/40 focus-visible:ring-accent/20",
            Icon && "pl-10",
            className,
          )}
          {...props}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
