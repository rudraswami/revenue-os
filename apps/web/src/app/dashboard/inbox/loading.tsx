import { InboxListSkeleton, InboxThreadSkeleton, Skeleton } from "@/components/ui/loading";

export default function InboxLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[480px] overflow-hidden rounded-2xl border border-border/80 bg-card" aria-busy="true">
      <div className="w-full max-w-sm shrink-0 border-r border-border/80 md:w-80 lg:w-96">
        <div className="border-b border-border/80 p-4">
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
        <InboxListSkeleton />
      </div>
      <div className="hidden flex-1 md:block">
        <InboxThreadSkeleton />
      </div>
    </div>
  );
}
