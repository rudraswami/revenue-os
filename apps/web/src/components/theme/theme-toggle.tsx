"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { ThemePreference } from "@/lib/theme";

/** Light / Dark / Auto theme control. Auto follows the OS preference. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <SegmentedControl<ThemePreference>
      aria-label="Theme"
      className={className}
      value={theme}
      onChange={setTheme}
      options={[
        {
          value: "light",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5" />
              Light
            </span>
          ),
        },
        {
          value: "dark",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5" />
              Dark
            </span>
          ),
        },
        {
          value: "system",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              Auto
            </span>
          ),
        },
      ]}
    />
  );
}
