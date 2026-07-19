"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InboxError({
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
      <p className="text-lg font-semibold text-foreground">Conversations couldn&apos;t load</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Check your connection and try again. Messages on WhatsApp are unaffected.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button type="button" className="rounded-xl" onClick={() => reset()}>
          Reload Conversations
        </Button>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href="/dashboard">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
