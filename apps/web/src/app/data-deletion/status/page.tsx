import { Suspense } from "react";
import DataDeletionStatusClient from "./status-client";

export default function DataDeletionStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background py-16 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <DataDeletionStatusClient />
    </Suspense>
  );
}
