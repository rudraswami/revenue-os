export type FollowUpPreset = "tomorrow" | "three_days" | "next_monday";

export function followUpDueAt(preset: FollowUpPreset, now = new Date()): Date {
  const d = new Date(now);
  if (preset === "tomorrow") {
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  }
  if (preset === "three_days") {
    d.setDate(d.getDate() + 3);
    d.setHours(10, 0, 0, 0);
    return d;
  }
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(10, 0, 0, 0);
  return d;
}

export function formatFollowUpTaskTitle(contactLabel: string, excerpt?: string | null): string {
  const base = `Follow up: ${contactLabel}`;
  if (!excerpt?.trim()) return base.slice(0, 200);
  const short =
    excerpt.trim().length > 80 ? `${excerpt.trim().slice(0, 77)}…` : excerpt.trim();
  return `${base} — ${short}`.slice(0, 200);
}
