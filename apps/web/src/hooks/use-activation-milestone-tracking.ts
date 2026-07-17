"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { trackActivation } from "@/lib/activation-analytics";
import { useAuthStore } from "@/stores/auth-store";

const MILESTONE_TRACKED_KEY = "growvisi-activation-milestones-tracked";

type Progress = {
  aiClassified: boolean;
  pipelineMoved: boolean;
  allComplete: boolean;
  ops?: { paid?: boolean; stage?: string };
};

/**
 * Persist once-per-milestone activation analytics (FAB is the action surface;
 * this hook only records truth, no UI).
 */
export function useActivationMilestoneTracking() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<Progress>("/organizations/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!progress) return;
    let tracked: Record<string, boolean> = {};
    try {
      tracked = JSON.parse(localStorage.getItem(MILESTONE_TRACKED_KEY) || "{}") as Record<
        string,
        boolean
      >;
    } catch {
      tracked = {};
    }

    const mark = (key: string, event: Parameters<typeof trackActivation>[0]) => {
      if (!tracked[key]) {
        trackActivation(event, { surface: "fab" });
        tracked[key] = true;
      }
    };

    if (progress.aiClassified) mark("aiClassified", "activation_first_classified");
    if (progress.pipelineMoved) mark("pipelineMoved", "activation_pipeline_moved");
    if (progress.allComplete) mark("allComplete", "activation_complete");
    if (progress.ops?.paid) mark("paid", "activation_ops_paid");

    localStorage.setItem(MILESTONE_TRACKED_KEY, JSON.stringify(tracked));
  }, [progress]);
}
