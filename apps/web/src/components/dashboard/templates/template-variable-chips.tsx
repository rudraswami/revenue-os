"use client";

import { insertTemplateVariable } from "./template-utils";
import { cn } from "@/lib/utils";

export function TemplateVariableChips({
  hints,
  body,
  onBodyChange,
  className,
}: {
  hints?: string[];
  body: string;
  onBodyChange: (value: string) => void;
  className?: string;
}) {
  const count = Math.max(hints?.length ?? 0, 3);
  const items = Array.from({ length: count }, (_, i) => ({
    index: i + 1,
    label: hints?.[i] ?? `Variable ${i + 1}`,
  }));

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map(({ index, label }) => (
        <button
          key={index}
          type="button"
          onClick={() => onBodyChange(insertTemplateVariable(body, index))}
          className="rounded-lg border border-border/80 bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition hover:border-accent/30 hover:bg-accent/5 hover:text-foreground"
        >
          {`{{${index}}}`}
          <span className="ml-1 text-[10px] opacity-70">{label}</span>
        </button>
      ))}
    </div>
  );
}
