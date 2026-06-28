import type { LeadStage } from "@growvisi/shared";
import { STAGE_LABELS } from "@/lib/crm";

function stageLabel(stage: unknown): string {
  if (typeof stage !== "string") return "Unknown";
  return STAGE_LABELS[stage as LeadStage] ?? stage[0] + stage.slice(1).toLowerCase();
}

export function formatActivityLabel(item: { type: string; data: Record<string, unknown> }): {
  primary: string;
  secondary?: string;
  href?: string;
} {
  const d = item.data;

  switch (item.type) {
    case "stage_change": {
      const name = (d.leadName as string) ?? "Lead";
      const to = stageLabel(d.to);
      const from = d.from ? stageLabel(d.from) : null;
      const won = d.to === "WON";
      const lost = d.to === "LOST";
      return {
        primary: won
          ? `${name} closed · Won`
          : lost
            ? `${name} marked Lost`
            : from
              ? `${name} → ${to}`
              : `${name} moved to ${to}`,
        secondary: d.isAi ? "AI suggested stage" : undefined,
        href: typeof d.leadId === "string" ? `/dashboard/pipeline` : undefined,
      };
    }
    case "ai_classification":
      return {
        primary: `AI classified ${(d.contactName as string) ?? "a lead"}`,
        secondary:
          [d.intent, d.stage ? stageLabel(d.stage) : null].filter(Boolean).join(" · ") ||
          (typeof d.summary === "string" ? d.summary.slice(0, 80) : undefined),
        href: "/dashboard/inbox",
      };
    case "task_created":
      return {
        primary: `Task: ${(d.title as string) ?? "Follow-up"}`,
        secondary: d.leadName ? `For ${d.leadName as string}` : undefined,
        href: "/dashboard/tasks",
      };
    case "task_completed":
      return {
        primary: `Done: ${(d.title as string) ?? "Task"}`,
        secondary: d.leadName ? `${d.leadName as string}` : undefined,
        href: "/dashboard/tasks",
      };
    case "note_added":
      return {
        primary: `${(d.author as string) ?? "Team"} added a note`,
        secondary: d.leadName ? `On ${d.leadName as string}` : undefined,
        href: "/dashboard/contacts",
      };
    case "automation_run":
      return {
        primary: (d.result as string) ?? "Automation ran",
        href: "/dashboard/automations",
      };
    default:
      return { primary: item.type };
  }
}
