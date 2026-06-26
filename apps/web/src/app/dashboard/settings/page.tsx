"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { SettingsShell } from "@/components/settings/settings-shell";

function SettingsLoading() {
  return (
    <div className="dashboard-page flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-accent" />
      Loading settings…
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsShell />
    </Suspense>
  );
}
