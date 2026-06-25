"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Tag as TagIcon, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ContactDetailDrawer } from "@/components/dashboard/contact-detail";
import { TagChip } from "@/components/dashboard/tag-chip";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { InboxListSkeleton } from "@/components/ui/skeleton";
import { apiDownload, apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  formatInr,
  formatRelative,
  LEAD_STAGES,
  readableOn,
  STAGE_BADGE,
  STAGE_LABELS,
  type CrmTag,
} from "@/lib/crm";
import type { LeadStage } from "@growvisi/shared";
import { cn } from "@/lib/utils";

interface ContactRow {
  id: string;
  displayName?: string | null;
  phone: string;
  email?: string | null;
  company?: string | null;
  stage: LeadStage;
  score: number;
  valueCents?: number | null;
  updatedAt: string;
  tags: CrmTag[];
  taskCount: number;
  noteCount: number;
}

const TAG_PALETTE = [
  "#006c49",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#475569",
];

export default function ContactsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<LeadStage | "">("");
  const [tagId, setTagId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);

  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (stage) params.set("stage", stage);
  if (tagId) params.set("tagId", tagId);
  const query = params.toString();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts", q, stage, tagId],
    queryFn: () =>
      apiFetch<ContactRow[]>(`/leads/contacts${query ? `?${query}` : ""}`, {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () =>
      apiFetch<Array<CrmTag & { leadCount: number }>>("/tags", { token: token ?? undefined }),
    enabled: !!token,
  });

  const createTag = useMutation({
    mutationFn: (body: { name: string; color: string }) =>
      apiFetch("/tags", { method: "POST", token: token ?? undefined, body: JSON.stringify(body) }),
    onSuccess: () => {
      setNewTagName("");
      void qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tags/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["tags"] }),
  });

  const total = contacts?.length ?? 0;
  const hot = useMemo(() => (contacts ?? []).filter((c) => c.score >= 80).length, [contacts]);
  const filtersActive = !!(q.trim() || stage || tagId);

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        description="Every WhatsApp lead in one searchable place — profiles, tags, notes, tasks and deal value."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowTagManager((v) => !v)}
            >
              <TagIcon className="h-3.5 w-3.5" /> Tags
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!token || total === 0}
              onClick={() =>
                token && void apiDownload("/leads/export?period=all", "growvisi-contacts.csv", token)
              }
            >
              Export
            </Button>
          </div>
        }
      />

      {showTagManager && (
        <DashboardPanel
          className="mb-6"
          title="Manage tags"
          description="Segment contacts for campaigns and filters."
        >
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (newTagName.trim()) createTag.mutate({ name: newTagName.trim(), color: newTagColor });
            }}
          >
            <div className="flex-1 min-w-[160px]">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tag name
              </span>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g. High intent"
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {TAG_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewTagColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    newTagColor === c ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
            <Button type="submit" size="sm" disabled={!newTagName.trim() || createTag.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {(tags ?? []).length === 0 && (
              <span className="text-xs text-muted-foreground">No tags yet.</span>
            )}
            {(tags ?? []).map((t) => (
              <span
                key={t.id}
                className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: t.color, color: readableOn(t.color) }}
              >
                {t.name}
                <span className="opacity-70">· {t.leadCount}</span>
                <button
                  type="button"
                  onClick={() => deleteTag.mutate(t.id)}
                  className="opacity-60 transition hover:opacity-100"
                  aria-label={`Delete ${t.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </DashboardPanel>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total contacts" value={total} />
        <StatCard label="Hot leads (80+)" value={hot} accent />
        <StatCard label="Tags" value={tags?.length ?? 0} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email, company…"
            className="h-10 pl-9 text-sm"
          />
        </div>
        <Select
          value={stage}
          onChange={(e) => setStage(e.target.value as LeadStage | "")}
          className="h-10 w-auto text-sm"
        >
          <option value="">All stages</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          value={tagId}
          onChange={(e) => setTagId(e.target.value)}
          className="h-10 w-auto text-sm"
        >
          <option value="">All tags</option>
          {(tags ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      <DashboardPanel noPadding>
        {isLoading ? (
          <div className="p-5">
            <InboxListSkeleton />
          </div>
        ) : total === 0 ? (
          <EmptyState
            compact
            icon={<Users className="h-6 w-6" />}
            title={filtersActive ? "No contacts match your filters" : "No contacts yet"}
            description={
              filtersActive
                ? "Try clearing search or filters."
                : "Contacts are created automatically when customers message you on WhatsApp."
            }
            actionHref={filtersActive ? undefined : "/dashboard/inbox"}
            actionLabel={filtersActive ? undefined : "Open conversations"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-3 py-3 font-semibold">Stage</th>
                  <th className="px-3 py-3 font-semibold">Score</th>
                  <th className="px-3 py-3 font-semibold">Value</th>
                  <th className="px-3 py-3 font-semibold">Tags</th>
                  <th className="px-3 py-3 font-semibold">Activity</th>
                </tr>
              </thead>
              <tbody>
                {contacts!.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className="cursor-pointer border-b border-border/60 transition hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={c.displayName || c.phone} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {c.displayName || c.phone}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.company ? `${c.company} · ` : ""}
                            {c.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          STAGE_BADGE[c.stage],
                        )}
                      >
                        {STAGE_LABELS[c.stage]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "font-semibold",
                          c.score >= 80 ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {c.score}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">
                      {formatInr(c.valueCents)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <TagChip key={t.id} tag={t} />
                        ))}
                        {c.tags.length > 3 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{c.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {formatRelative(c.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>

      <ContactDetailDrawer leadId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-success" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}
