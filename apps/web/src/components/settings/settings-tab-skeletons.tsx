import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { SettingsTabId } from "@/lib/settings-access";
import { SettingsTabContentFrame } from "@/components/settings/settings-plan-gate";
import { cn } from "@/lib/utils";

const ROW_CLASS = "h-[4.5rem] w-full rounded-xl";

function SectionBlockSkeleton({
  titleWidth = "w-40",
  rows = 4,
}: {
  titleWidth?: string;
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card elev-1">
      <div className="border-b border-border/60 bg-background px-5 py-4">
        <Skeleton className={cn("h-4", titleWidth)} />
        <Skeleton className="mt-2.5 h-3 w-72 max-w-full" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={ROW_CLASS} />
        ))}
      </div>
    </div>
  );
}

export function WorkspaceTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div className="space-y-5" aria-busy="true" aria-label="Loading workspace">
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card elev-1 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-[3.75rem] w-28 rounded-xl" />
              <Skeleton className="h-[3.75rem] w-28 rounded-xl" />
              <Skeleton className="h-[3.75rem] w-32 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <SectionBlockSkeleton titleWidth="w-44" rows={3} />
      </div>
    </SettingsTabContentFrame>
  );
}

export function PeopleTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div className="space-y-5" aria-busy="true" aria-label="Loading people">
        <SectionBlockSkeleton titleWidth="w-36" rows={5} />
        <SectionBlockSkeleton titleWidth="w-44" rows={4} />
        <SectionBlockSkeleton titleWidth="w-32" rows={3} />
      </div>
    </SettingsTabContentFrame>
  );
}

export function WhatsappTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div className="space-y-5" aria-busy="true" aria-label="Loading WhatsApp settings">
        <Skeleton className="h-[320px] w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </SettingsTabContentFrame>
  );
}

export function BillingTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div aria-busy="true" aria-label="Loading billing">
        <SectionBlockSkeleton titleWidth="w-48" rows={6} />
      </div>
    </SettingsTabContentFrame>
  );
}

export function IntelligenceTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div className="space-y-5" aria-busy="true" aria-label="Loading intelligence settings">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <SectionBlockSkeleton titleWidth="w-36" rows={3} />
        <SectionBlockSkeleton titleWidth="w-44" rows={5} />
        <SectionBlockSkeleton titleWidth="w-36" rows={4} />
      </div>
    </SettingsTabContentFrame>
  );
}

export function GrowthTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div className="space-y-5" aria-busy="true" aria-label="Loading growth settings">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <SectionBlockSkeleton titleWidth="w-40" rows={3} />
        <SectionBlockSkeleton titleWidth="w-44" rows={4} />
      </div>
    </SettingsTabContentFrame>
  );
}

function DeveloperBlockSkeleton({ labelWidth }: { labelWidth: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className={cn("h-4", labelWidth)} />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-40 rounded-xl" />
        <Skeleton className="h-10 flex-1 min-w-[12rem] rounded-xl" />
      </div>
      <Skeleton className={ROW_CLASS} />
      <Skeleton className={ROW_CLASS} />
      <Skeleton className={ROW_CLASS} />
    </div>
  );
}

export function DevelopersTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card elev-1" aria-busy="true" aria-label="Loading developer settings">
        <div className="border-b border-border/60 bg-background px-5 py-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2.5 h-3 w-80 max-w-full" />
        </div>
        <div className="space-y-6 p-5">
          <DeveloperBlockSkeleton labelWidth="w-24" />
          <div className="border-t border-border/60 pt-6">
            <DeveloperBlockSkeleton labelWidth="w-32" />
          </div>
        </div>
      </div>
    </SettingsTabContentFrame>
  );
}

export function AccountTabSkeleton() {
  return (
    <SettingsTabContentFrame>
      <div className="space-y-5" aria-busy="true" aria-label="Loading account">
        <SectionBlockSkeleton titleWidth="w-28" rows={4} />
        <SectionBlockSkeleton titleWidth="w-24" rows={2} />
        <SectionBlockSkeleton titleWidth="w-36" rows={2} />
        <SectionBlockSkeleton titleWidth="w-32" rows={3} />
      </div>
    </SettingsTabContentFrame>
  );
}

const TAB_SKELETONS: Record<SettingsTabId, () => ReactNode> = {
  workspace: WorkspaceTabSkeleton,
  people: PeopleTabSkeleton,
  whatsapp: WhatsappTabSkeleton,
  billing: BillingTabSkeleton,
  intelligence: IntelligenceTabSkeleton,
  growth: GrowthTabSkeleton,
  developers: DevelopersTabSkeleton,
  account: AccountTabSkeleton,
};

export function SettingsTabSkeleton({ tab }: { tab: SettingsTabId }) {
  const SkeletonView = TAB_SKELETONS[tab];
  return <>{SkeletonView()}</>;
}
