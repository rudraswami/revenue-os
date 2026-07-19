"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toUserMessage } from "@/lib/api-client";

/** Shown when shell-bootstrap fails — workspace chrome still works; banners may be stale. */
export function ShellBootstrapErrorBanner({
  error,
  onRetry,
  isRetrying,
}: {
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      className="mx-4 mb-3 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-amber-950 lg:mx-8 lg:mt-6"
      role="alert"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Couldn&apos;t refresh workspace status</p>
          <p className="mt-0.5 text-xs opacity-90">
            {toUserMessage(error, "Some banners and plan limits may be out of date until this loads.")}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-amber-300/80 bg-white/80"
        disabled={isRetrying}
        isLoading={isRetrying}
        onClick={onRetry}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}
