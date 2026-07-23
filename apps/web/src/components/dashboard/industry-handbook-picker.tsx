"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CUSTOM_INDUSTRY_ID, type IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { SelectableTile } from "@/components/ui/selectable-tile";
import { useToast } from "@/components/ui/toast";
import { useMutationPendingId } from "@/hooks/use-mutation-pending-id";

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

  const pendingId = useMutationPendingId(applyMutation);
  const activeId = pendingId ?? currentIndustryId;

  if (!handbooks?.length) return null;

  return (
    <div className="space-y-2">
      {showHeading ? (
        <p className="text-xs font-medium text-foreground">Industry template</p>
      ) : null}
      {currentIndustryId && !pendingId ? (
        <p className="text-xs text-muted-foreground">
          Active:{" "}
          <span className="font-medium text-foreground">
            {handbooks.find((h) => h.id === currentIndustryId)?.label ??
              (currentIndustryId === CUSTOM_INDUSTRY_ID ? "Other business" : currentIndustryId)}
          </span>
        </p>
      ) : pendingId ? (
        <p className="text-xs font-medium text-accent">Seeding starter docs…</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tap a sector to apply a template, or choose Other for a custom business.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {handbooks.map((hb) => (
          <SelectableTile
            key={hb.id}
            title={hb.label}
            description={hb.description}
            selected={activeId === hb.id}
            pending={pendingId === hb.id}
            disabled={!canManage || (applyMutation.isPending && pendingId !== hb.id)}
            onClick={() => canManage && applyMutation.mutate(hb.id)}
          />
        ))}
      </div>
    </div>
  );
}
