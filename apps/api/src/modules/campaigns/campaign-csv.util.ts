export function csvEscape(value: string | null | undefined): string {
  const s = value ?? "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCampaignRecipientsCsv(
  rows: Array<{
    phone: string;
    name?: string | null;
    status: string;
    error?: string | null;
    sentAt?: Date | null;
    repliedAt?: Date | null;
    conversationId?: string | null;
  }>,
): string {
  const header = "phone,name,status,error,sent_at,replied_at,conversation_id";
  const lines = rows.map((r) =>
    [
      csvEscape(r.phone),
      csvEscape(r.name),
      csvEscape(r.status),
      csvEscape(r.error),
      csvEscape(r.sentAt?.toISOString() ?? ""),
      csvEscape(r.repliedAt?.toISOString() ?? ""),
      csvEscape(r.conversationId),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}
