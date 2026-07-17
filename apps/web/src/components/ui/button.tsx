import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Growvisi button — accent green is the app primary CTA.
 * `brand` keeps navy for rare chrome/marketing inverse needs.
 * Radius: controls use rounded-xl (chips stay rounded-full elsewhere).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-[var(--color-accent-hover)]",
        accent: "bg-accent text-accent-foreground hover:bg-[var(--color-accent-hover)]",
        brand: "bg-primary text-primary-foreground hover:bg-[var(--color-primary-hover)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-primary-light/60",
        ghost: "text-foreground hover:bg-muted",
        outline: "border border-border bg-card text-foreground hover:bg-muted",
        link: "text-accent underline-offset-4 hover:underline p-0 h-auto font-medium",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40",
      },
      size: {
        default: "h-11 rounded-xl px-5 text-sm",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-xl px-7 text-[15px]",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
