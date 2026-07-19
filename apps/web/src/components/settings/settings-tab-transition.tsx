"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SettingsTabTransition({
  tabKey,
  isPending,
  children,
  className,
}: {
  tabKey: string;
  isPending?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      key={tabKey}
      className={cn(
        "settings-tab-panel",
        isPending && "settings-tab-panel-pending",
        className,
      )}
    >
      {children}
    </div>
  );
}
