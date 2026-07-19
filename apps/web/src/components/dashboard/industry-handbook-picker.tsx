"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function IndustryHandbookPicker({
  canManage,
  currentIndustryId,
  token,
  showHeading = true,
}: {
  canManage: boolean;
  currentIndustryId?: string;
  token: string | null;
  showHeading?: boolean;
}) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: handbooks } = useQuery({
    queryKey: ["industry-handbooks"],
    queryFn: () =>
      apiFetch<Array<{ id: string; label: string; description: string }>>(
        "/organizations/industry-handbooks",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const applyMutation = useMutation({
    mutationFn: (industryId: string) =>
      apiFetch<{ message: string; intelligence: IntelligenceWorkspaceSettings }>(
        "/organizations/apply-industry-handbook",
        {
          method: "POST",
          token: token ?? undefined,
          body: JSON.stringify({ industryId, seedKnowledge: true }),
        },
      ),
    onSuccess: (res) => {
      queryClient.setQueryData(["intelligence-settings"], res.intelligence);
      void queryClient.invalidateQueries({ queryKey: ["knowledge-health"] });
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      success(res.message);
    },
    onError: () => toastError("Could not apply industry template."),
  });

  if (!handbooks?.length) return null;

  return (
    <div className="space-y-2">
      {showHeading ? (
        <p className="text-xs font-medium text-foreground">Industry template</p>
      ) : null}
      {currentIndustryId ? (
        <p className="text-xs text-muted-foreground">
          Active:{" "}
          <span className="font-medium text-foreground">
            {handbooks.find((h) => h.id === currentIndustryId)?.label ?? currentIndustryId}
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tap a sector to seed starter docs and voice settings.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {handbooks.map((hb) => (
          <button
            key={hb.id}
            type="button"
            disabled={!canManage || applyMutation.isPending}
            onClick={() => canManage && applyMutation.mutate(hb.id)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left transition",
              currentIndustryId === hb.id
                ? "border-accent/40 bg-bento-mint/50 ring-1 ring-accent/20"
                : "border-border/50 bg-card hover:border-accent/25 hover:bg-bento-mint/15",
              !canManage && "cursor-not-allowed opacity-70",
            )}
          >
            <p className="text-xs font-semibold text-foreground">{hb.label}</p>
            {!showHeading && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{hb.description}</p>
            )}
            {showHeading && (
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hb.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
