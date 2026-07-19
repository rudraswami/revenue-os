"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="dashboard-page flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-lg font-semibold text-foreground">Something went wrong</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This page hit an unexpected error. Try again — your data is safe.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button type="button" className="rounded-xl" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href="/dashboard">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
