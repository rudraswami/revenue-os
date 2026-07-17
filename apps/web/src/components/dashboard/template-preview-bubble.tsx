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
}: {
  body: string;
  params?: string[];
  className?: string;
}) {
  const text = renderTemplateBody(body, params);

  return (
    <div className={cn("rounded-2xl border border-border bg-bento-mint p-4", className)}>
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-whatsapp text-xs font-bold text-white">
          WA
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-whatsapp">
            WhatsApp preview
          </p>
          <p className="text-xs text-muted-foreground">How customers will see it</p>
        </div>
      </div>
      <div className="relative max-w-[92%] rounded-xl rounded-tl-sm bg-card px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
        {text || (
          <span className="text-muted-foreground italic">Select a template to preview</span>
        )}
        <span className="mt-1 block text-right text-xs text-muted-foreground">12:30 PM</span>
      </div>
    </div>
  );
}
