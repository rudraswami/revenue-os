"use client";

import { cn } from "@/lib/utils";

/** Replace Meta template placeholders {{1}}, {{2}}, … with sample values. */
export function renderTemplateBody(
  body: string,
  params: string[] = [],
): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const idx = Number(n) - 1;
    const val = params[idx]?.trim();
    return val || `[variable ${n}]`;
  });
}

export function TemplatePreviewBubble({
  body,
  params = [],
  className,
  compact = false,
}: {
  body: string;
  params?: string[];
  className?: string;
  compact?: boolean;
}) {
  const text = renderTemplateBody(body, params);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-muted/30",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Preview
      </p>
      <div
        className={cn(
          "rounded-2xl rounded-tl-md bg-card px-3 py-2.5 text-sm leading-relaxed text-foreground shadow-sm ring-1 ring-border/40",
          compact ? "min-h-[80px]" : "min-h-[100px]",
        )}
      >
        {text || (
          <span className="text-muted-foreground italic">Your message will appear here</span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">How customers see it on WhatsApp</p>
    </div>
  );
}
