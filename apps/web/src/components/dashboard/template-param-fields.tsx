"use client";

import { Input } from "@/components/ui/input";

/** Resize param array when template variable count changes, preserving existing values. */
export function resizeTemplateParams(count: number, prev: string[]): string[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => prev[i] ?? "");
}

/** True when every required template variable has a non-empty value. */
export function templateParamsReady(count: number, values: string[]): boolean {
  if (count <= 0) return true;
  return resizeTemplateParams(count, values).every((v) => v.trim().length > 0);
}

/** Trim and return exactly `count` params for the Meta template API. */
export function buildTemplateParamsPayload(count: number, values: string[]): string[] {
  return resizeTemplateParams(count, values).map((v) => v.trim());
}

export function TemplateParamFields({
  count,
  values,
  onChange,
  disabled,
  className,
}: {
  count: number;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <div className={className ?? "space-y-2"}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Template variable {`{{${i + 1}}}`}
          </label>
          <Input
            value={values[i] ?? ""}
            onChange={(e) => {
              const next = resizeTemplateParams(count, values);
              next[i] = e.target.value;
              onChange(next);
            }}
            placeholder={i === 0 ? "Customer name or offer" : `Value for {{${i + 1}}}`}
            className="h-11 rounded-xl text-sm"
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
