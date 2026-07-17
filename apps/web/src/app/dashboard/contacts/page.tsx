"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Tag as TagIcon, Users, MoreVertical, Download } from "lucide-react";
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
import { QueryErrorState } from "@/components/ui/query-state";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiDownload, apiFetch, isUpgradeFrictionError, toUserMessage } from "@/lib/api-client";
import { UpgradeFrictionBanner } from "@/components/dashboard/upgrade-friction-banner";
import { canWrite } from "@/lib/permissions";
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
import { HOT_LEAD_SCORE_THRESHOLD, type LeadStage } from "@growvisi/shared";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

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
  const role = useAuthStore((s) => s.role);
  const canEdit = canWrite(role);
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<LeadStage | "">("");
  const [tagId, setTagId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState(TAG_PALETTE[0]);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "50");
  if (q.trim()) params.set("q", q.trim());
  if (stage) params.set("stage", stage);
  if (tagId) params.set("tagId", tagId);
  if (ownerId) params.set("ownerId", ownerId);
  const query = params.toString();

  const { data: contactPage, isLoading, isError, refetch } = useQuery({
    queryKey: ["contacts", q, stage, tagId, ownerId, page],
    queryFn: () =>
      apiFetch<{ data: ContactRow[]; total: number; page: number; hasMore: boolean }>(
        `/leads/contacts?${query}`,
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const contacts = contactPage?.data ?? [];

  useEffect(() => {
    setPage(1);
  }, [q, stage]);

  const { data: members } = useQuery({
    queryKey: ["organization-members"],
    queryFn: () =>
      apiFetch<Array<{ user: { id: string; name: string | null; email: string } }>>(
        "/organizations/members",
        { token: token ?? undefined },
      ),
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
      success(t("toast.tagCreated"));
      void qc.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: () => toastError(t("toast.actionFailed")),
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tags/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => {
      success(t("toast.tagDeleted"));
      void qc.invalidateQueries({ queryKey: ["tags"] });
    },
    onError: () => toastError(t("toast.actionFailed")),
  });

  const updateTag = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      apiFetch(`/tags/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ name, color }),
      }),
    onSuccess: () => {
      setEditingTagId(null);
      success(t("toast.tagUpdated"));
      void qc.invalidateQueries({ queryKey: ["tags"] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toastError(t("toast.actionFailed")),
  });

  const createContact = useMutation({
    mutationFn: () =>
      apiFetch("/leads/contacts", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          phone: newPhone.trim(),
          displayName: newName.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setNewPhone("");
      setNewName("");
      setShowAddContact(false);
      success(t("toast.contactCreated"));
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err) => {
      if (!isUpgradeFrictionError(err)) toastError(t("toast.actionFailed"));
    },
  });

  const total = contactPage?.total ?? 0;
  const hot = useMemo(
    () => contacts.filter((c) => c.score >= HOT_LEAD_SCORE_THRESHOLD).length,
    [contacts],
  );
  const filtersActive = !!(q.trim() || stage || tagId);

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        description="Every WhatsApp lead in one searchable place — profiles, tags, notes, tasks and deal value."
        action={
          <>
            <div className="hidden gap-2 sm:flex">
              {canEdit && (
                <Button variant="accent" size="sm" className="gap-1.5" onClick={() => setShowAddContact(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add contact
                </Button>
              )}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 sm:hidden" aria-label="Contact actions">
                  <MoreVertical className="h-4 w-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setShowAddContact(true)}>
                    <Plus className="h-4 w-4" />
                    Add contact
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowTagManager((v) => !v)}>
                  <TagIcon className="h-4 w-4" />
                  Manage tags
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!token || total === 0}
                  onClick={() =>
                    token && void apiDownload("/leads/export?period=all", "growvisi-contacts.csv", token)
                  }
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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
                {editingTagId === t.id ? (
                  <>
                    <input
                      value={editTagName}
                      onChange={(e) => setEditTagName(e.target.value)}
                      className="w-20 rounded bg-white/90 px-1 text-[11px] text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateTag.mutate({ id: t.id, name: editTagName.trim(), color: editTagColor })
                      }
                      className="text-[10px] underline"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (canEdit) {
                          setEditingTagId(t.id);
                          setEditTagName(t.name);
                          setEditTagColor(t.color);
                        }
                      }}
                    >
                      {t.name}
                    </button>
                    <span className="opacity-70">· {t.leadCount}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => deleteTag.mutate(t.id)}
                        className="opacity-60 transition hover:opacity-100"
                        aria-label={`Delete ${t.name}`}
                      >
                        ×
                      </button>
                    )}
                  </>
                )}
              </span>
            ))}
          </div>
        </DashboardPanel>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total contacts" value={total} />
        <StatCard label={`Hot leads (${HOT_LEAD_SCORE_THRESHOLD}+)`} value={hot} accent />
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
          onChange={(e) => {
            setTagId(e.target.value);
            setPage(1);
          }}
          className="h-10 w-auto text-sm"
        >
          <option value="">All tags</option>
          {(tags ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          value={ownerId}
          onChange={(e) => {
            setOwnerId(e.target.value);
            setPage(1);
          }}
          className="h-10 w-auto text-sm"
        >
          <option value="">All owners</option>
          {(members ?? []).map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name ?? m.user.email}
            </option>
          ))}
        </Select>
      </div>

      <DashboardPanel noPadding>
        {isLoading ? (
          <div className="p-5">
            <InboxListSkeleton />
          </div>
        ) : isError ? (
          <div className="p-5">
            <QueryErrorState
              title="Couldn't load contacts"
              onRetry={() => void refetch()}
            />
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
                {contacts.map((c) => (
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
                          c.score >= HOT_LEAD_SCORE_THRESHOLD ? "text-success" : "text-muted-foreground",
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
            {contactPage && contactPage.total > contactPage.data.length && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
                <span className="text-muted-foreground">
                  Page {contactPage.page} · {contactPage.total} contacts
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!contactPage.hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DashboardPanel>

      {showAddContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold">Add contact</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Phone with country code (e.g. 919876543210). Use outbound from Inbox to message them.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone number"
                className="h-10"
              />
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (optional)"
                className="h-10"
              />
              {createContact.isError &&
                (isUpgradeFrictionError(createContact.error) ? (
                  <UpgradeFrictionBanner
                    compact
                    reason={createContact.error.meta?.reason ?? "leads"}
                    message={toUserMessage(createContact.error, "Lead limit reached.")}
                    suggestedPlan={createContact.error.meta?.suggestedPlan}
                    limit={createContact.error.meta?.limit}
                    used={createContact.error.meta?.used}
                  />
                ) : (
                  <p className="text-xs text-destructive">
                    {toUserMessage(createContact.error, "Could not add contact.")}
                  </p>
                ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddContact(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createContact.mutate()}
                disabled={!newPhone.trim() || createContact.isPending}
              >
                {createContact.isPending ? "Saving…" : "Add contact"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
