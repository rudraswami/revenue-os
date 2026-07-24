"use client";

import { GrowvisiLogoLoader } from "@/components/ui/loading";

export function TemplateDialogBusy({ message }: { message?: string }) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label={message ?? "Working"}
    >
      <GrowvisiLogoLoader size="md" />
      {message ? <p className="text-sm font-medium text-muted-foreground">{message}</p> : null}
    </div>
  );
}
