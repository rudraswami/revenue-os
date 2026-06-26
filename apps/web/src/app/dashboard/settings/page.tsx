"use client";

import { Suspense } from "react";
import { SettingsPageSkeleton } from "@/components/settings/settings-page-skeleton";
import { SettingsShell } from "@/components/settings/settings-shell";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <SettingsShell />
    </Suspense>
  );
}
