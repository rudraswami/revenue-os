"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FloatingSetupDock } from "@/components/dashboard/floating-setup-dock";
import { GrowvisiHelpFab } from "@/components/support/growvisi-help-fab";
import { usePendingSetupActions } from "@/hooks/use-pending-setup-actions";
import { resolveHelpContext } from "@/lib/setup-help-content";

/**
 * One floating assist control per dashboard view.
 * Setup checklist wins while milestones are incomplete; help-only after that.
 */
function DashboardAssistLayerInner() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const helpContext = resolveHelpContext(pathname, tab) ?? "general";
  const { allComplete, isLoading, totalCount } = usePendingSetupActions();

  const showSetup = !isLoading && !allComplete && totalCount > 0;

  if (showSetup) {
    return <FloatingSetupDock helpContext={helpContext} />;
  }

  return <GrowvisiHelpFab context={helpContext} />;
}

export function DashboardAssistLayer() {
  return (
    <Suspense fallback={null}>
      <DashboardAssistLayerInner />
    </Suspense>
  );
}
