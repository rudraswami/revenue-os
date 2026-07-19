import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { SettingsTabId } from "@/lib/settings-access";

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card elev-1">
      <div className="border-b border-border/60 bg-background px-5 py-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-56 max-w-full" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function WorkspaceTabSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading workspace">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card elev-1 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-3 w-32" />
              <Skeleton className="mt-3 h-3 w-full max-w-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-14 w-24 rounded-xl" />
            <Skeleton className="h-14 w-24 rounded-xl" />
            <Skeleton className="h-14 w-28 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <CardSkeleton rows={3} />
    </div>
  );
}

export function PeopleTabSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading people">
      <CardSkeleton rows={5} />
      <CardSkeleton rows={4} />
    </div>
  );
}

export function WhatsappTabSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading WhatsApp settings">
      <Skeleton className="h-[280px] w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

export function BillingTabSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading billing">
      <CardSkeleton rows={6} />
    </div>
  );
}

export function IntelligenceTabSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading intelligence settings">
      <CardSkeleton rows={5} />
      <CardSkeleton rows={4} />
      <CardSkeleton rows={3} />
    </div>
  );
}

export function GrowthTabSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading growth settings">
      <CardSkeleton rows={3} />
      <CardSkeleton rows={4} />
    </div>
  );
}

export function DevelopersTabSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading developer settings">
      <CardSkeleton rows={5} />
    </div>
  );
}

export function AccountTabSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading account">
      <CardSkeleton rows={4} />
      <CardSkeleton rows={2} />
    </div>
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
