"use client";

import { X } from "lucide-react";
import { readableOn, type CrmTag } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function TagChip({
  tag,
  onRemove,
  className,
}: {
  tag: CrmTag;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: tag.color, color: readableOn(tag.color) }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 rounded-full opacity-70 transition hover:opacity-100"
          aria-label={`Remove ${tag.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
