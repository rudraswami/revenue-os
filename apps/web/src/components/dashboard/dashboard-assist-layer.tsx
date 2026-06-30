"use client";

import { Suspense } from "react";
import { WorkspaceAssistFab } from "@/components/dashboard/workspace-assist-fab";

/** Dashboard floating assist — exactly one FAB, mounted once from dashboard-shell. */
export function DashboardAssistLayer() {
  return (
    <Suspense fallback={null}>
      <WorkspaceAssistFab />
    </Suspense>
  );
}
