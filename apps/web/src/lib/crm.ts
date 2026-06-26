import type { LeadStage } from "@growvisi/shared";

export const LEAD_STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const STAGE_BADGE: Record<LeadStage, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-sky-100 text-sky-700",
  QUALIFIED: "bg-indigo-100 text-indigo-700",
  PROPOSAL: "bg-violet-100 text-violet-700",
  NEGOTIATION: "bg-amber-100 text-amber-800",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-rose-100 text-rose-700",
};

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const PRIORITY_BADGE: Record<TaskPriority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-rose-100 text-rose-700",
};

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "RUNNING"
  | "COMPLETED"
  | "PAUSED"
  | "FAILED";

export const CAMPAIGN_STATUS_BADGE: Record<CampaignStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-sky-100 text-sky-700",
  RUNNING: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-slate-100 text-slate-600",
  FAILED: "bg-rose-100 text-rose-700",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  RUNNING: "Sending",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  FAILED: "Failed",
};

export interface CrmTag {
  id: string;
  name: string;
  color: string;
}

export interface TeamMember {
  id: string;
  name?: string | null;
  email: string;
}

/** Format INR from paise/cents. valueCents is stored in the smallest unit. */
export function formatInr(valueCents?: number | null): string {
  if (valueCents == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

export function formatRelative(date?: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTimeIst(date?: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Pick readable text color for a hex background. */
export function readableOn(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b1c30" : "#ffffff";
}
