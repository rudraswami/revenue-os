"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  MessageCircle,
  Plus,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  formatDate,
  formatInr,
  formatRelative,
  LEAD_STAGES,
  PRIORITY_BADGE,
  STAGE_LABELS,
  readableOn,
  type CrmTag,
  type TaskPriority,
  type TeamMember,
} from "@/lib/crm";
import { HOT_LEAD_SCORE_THRESHOLD, type LeadStage } from "@growvisi/shared";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TagChip } from "./tag-chip";
import { LostReasonDialog } from "./lost-reason-dialog";
import { cn } from "@/lib/utils";

interface ContactNote {
  id: string;
  body: string;
  createdAt: string;
  author?: { id: string; name?: string | null; email: string } | null;
}

interface ContactTask {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: TaskPriority;
  dueAt?: string | null;
  assignedTo?: { id: string; name?: string | null; email: string } | null;
}

interface ContactDetail {
  id: string;
  displayName?: string | null;
  phone: string;
  email?: string | null;
  company?: string | null;
  stage: LeadStage;
  lostReason?: string | null;
  wonReason?: string | null;
  score: number;
  valueCents?: number | null;
  ownerId?: string | null;
  source?: string | null;
  createdAt: string;
  lastClassifiedAt?: string | null;
  tags: CrmTag[];
  conversation?: { id: string; status: string; unreadCount: number; lastMessageAt?: string | null } | null;
  notes: ContactNote[];
  tasks: ContactTask[];
}

export function ContactDetailDrawer({
  leadId,
  onClose,
}: {
  leadId: string | null;
  onClose: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const open = !!leadId;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [newTask, setNewTask] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [dealValue, setDealValue] = useState("");
  const [lostPrompt, setLostPrompt] = useState(false);
  const [pendingStage, setPendingStage] = useState<LeadStage | null>(null);

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", leadId],
    queryFn: () => apiFetch<ContactDetail>(`/leads/${leadId}`, { token: token ?? undefined }),
    enabled: open && !!token,
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<CrmTag[]>("/tags", { token: token ?? undefined }),
    enabled: open && !!token,
  });

  const { data: members } = useQuery({
    queryKey: ["org-members"],
    queryFn: () =>
      apiFetch<Array<{ user: TeamMember }>>("/organizations/members", { token: token ?? undefined }),
    enabled: open && !!token,
  });

  useEffect(() => {
    if (contact) {
      setName(contact.displayName ?? "");
      setEmail(contact.email ?? "");
      setCompany(contact.company ?? "");
      setDealValue(
        contact.valueCents != null ? String(Math.round(contact.valueCents / 100)) : "",
      );
    }
  }, [contact]);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["contact", leadId] });
    void qc.invalidateQueries({ queryKey: ["contacts"] });
    void qc.invalidateQueries({ queryKey: ["pipeline"] });
  }

  const saveProfile = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch(`/leads/${leadId}/contact`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const setStage = useMutation({
    mutationFn: ({ stage, reason }: { stage: LeadStage; reason?: string }) =>
      apiFetch(`/leads/${leadId}/stage`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ stage, reason }),
      }),
    onSuccess: invalidate,
  });

  const addNote = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/leads/${leadId}/notes`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setNoteBody("");
      invalidate();
    },
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: string) =>
      apiFetch(`/leads/${leadId}/notes/${noteId}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: invalidate,
  });

  const addTask = useMutation({
    mutationFn: (title: string) =>
      apiFetch("/tasks", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ title, leadId }),
      }),
    onSuccess: () => {
      setNewTask("");
      invalidate();
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const toggleTask = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactTask["status"] }) =>
      apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const assignTag = useMutation({
    mutationFn: (tagId: string) =>
      apiFetch(`/tags/leads/${leadId}/${tagId}`, { method: "POST", token: token ?? undefined }),
    onSuccess: () => {
      setTagOpen(false);
      invalidate();
    },
  });

  const removeTag = useMutation({
    mutationFn: (tagId: string) =>
      apiFetch(`/tags/leads/${leadId}/${tagId}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: invalidate,
  });

  const setOwner = useMutation({
    mutationFn: (ownerId: string) =>
      apiFetch(`/leads/${leadId}/contact`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ ownerId }),
      }),
    onSuccess: invalidate,
  });

  const displayName = contact?.displayName || contact?.phone || "Contact";
  const availableTags = (tags ?? []).filter(
    (t) => !contact?.tags.some((ct) => ct.id === t.id),
  );

  return (
    <>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <AvatarInitials name={displayName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{contact?.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted"
                aria-label="Close contact details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isLoading || !contact ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Loading contact…
              </div>
            ) : (
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 custom-scrollbar">
                {/* Stage + score + value */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Stage
                    </p>
                    <Select
                      value={contact.stage}
                      onChange={(e) => {
                        const next = e.target.value as LeadStage;
                        if (next === "LOST" && contact.stage !== "LOST") {
                          setPendingStage(next);
                          setLostPrompt(true);
                          return;
                        }
                        setStage.mutate({ stage: next });
                      }}
                      className="h-9 text-xs"
                    >
                      {LEAD_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                    {contact.stage === "LOST" && contact.lostReason && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Lost reason: <span className="font-medium text-foreground">{contact.lostReason}</span>
                      </p>
                    )}
                    {contact.stage === "WON" && contact.wonReason && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Won reason: <span className="font-medium text-foreground">{contact.wonReason}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Score
                    </p>
                    <div
                      className={cn(
                        "flex h-9 items-center justify-center rounded-lg text-sm font-bold",
                        contact.score >= HOT_LEAD_SCORE_THRESHOLD
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {contact.score}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Value (₹)
                    </p>
                    <Input
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      onBlur={() => {
                        const rupees = dealValue.trim() === "" ? null : Math.round(Number(dealValue) * 100);
                        const current = contact.valueCents ?? null;
                        if (rupees !== current) {
                          saveProfile.mutate({ valueCents: rupees });
                        }
                      }}
                      type="number"
                      min={0}
                      className="h-9 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Tags */}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tags
                    </p>
                    <button
                      type="button"
                      onClick={() => setTagOpen((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <TagIcon className="h-3.5 w-3.5" /> Add tag
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.length === 0 && (
                      <span className="text-xs text-muted-foreground">No tags yet</span>
                    )}
                    {contact.tags.map((t) => (
                      <TagChip key={t.id} tag={t} onRemove={() => removeTag.mutate(t.id)} />
                    ))}
                  </div>
                  {tagOpen && (
                    <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-border bg-muted/30 p-2.5">
                      {availableTags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          No more tags. Create tags from the Contacts page.
                        </span>
                      ) : (
                        availableTags.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => assignTag.mutate(t.id)}
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold transition hover:opacity-80"
                            style={{ backgroundColor: t.color, color: readableOn(t.color) }}
                          >
                            {t.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </section>

                {/* Profile fields */}
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Details
                  </p>
                  <Field label="Name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => name !== (contact.displayName ?? "") && saveProfile.mutate({ displayName: name })}
                      className="h-9 text-sm"
                      placeholder="Add a name"
                    />
                  </Field>
                  <Field label="Email">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => email !== (contact.email ?? "") && saveProfile.mutate({ email })}
                      className="h-9 text-sm"
                      placeholder="Add an email"
                    />
                  </Field>
                  <Field label="Company">
                    <Input
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      onBlur={() => company !== (contact.company ?? "") && saveProfile.mutate({ company })}
                      className="h-9 text-sm"
                      placeholder="Add a company"
                    />
                  </Field>
                  <Field label="Owner">
                    <Select
                      value={contact.ownerId ?? ""}
                      onChange={(e) => setOwner.mutate(e.target.value)}
                      className="h-9 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {(members ?? []).map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name ?? m.user.email}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </section>

                {/* Tasks */}
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tasks
                  </p>
                  <div className="space-y-1.5">
                    {contact.tasks.length === 0 && (
                      <p className="text-xs text-muted-foreground">No tasks for this contact.</p>
                    )}
                    {contact.tasks.map((t) => {
                      const done = t.status === "DONE";
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 rounded-lg border border-border/70 bg-white px-2.5 py-2"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleTask.mutate({ id: t.id, status: done ? "OPEN" : "DONE" })
                            }
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                              done
                                ? "border-success bg-success text-white"
                                : "border-border text-transparent hover:border-accent",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className={cn(
                              "flex-1 text-sm",
                              done && "text-muted-foreground line-through",
                            )}
                          >
                            {t.title}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                              PRIORITY_BADGE[t.priority],
                            )}
                          >
                            {t.priority}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newTask.trim()) addTask.mutate(newTask.trim());
                    }}
                  >
                    <Input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Add a follow-up task…"
                      className="h-9 text-sm"
                    />
                    <Button type="submit" size="sm" disabled={!newTask.trim() || addTask.isPending}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                </section>

                {/* Notes */}
                <section>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </p>
                  <form
                    className="space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (noteBody.trim()) addNote.mutate(noteBody.trim());
                    }}
                  >
                    <textarea
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      placeholder="Log a call, a requirement, or context for your team…"
                      rows={2}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" disabled={!noteBody.trim() || addNote.isPending}>
                        Add note
                      </Button>
                    </div>
                  </form>
                  <div className="mt-3 space-y-2.5">
                    {contact.notes.map((n) => (
                      <div key={n.id} className="group rounded-xl border border-border/70 bg-muted/20 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground">
                            {n.author?.name ?? n.author?.email ?? "Team"}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatRelative(n.createdAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteNote.mutate(n.id)}
                              className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-1 text-xs text-muted-foreground">
                  <p>Source: {contact.source ?? "WhatsApp"}</p>
                  <p>Created: {formatDate(contact.createdAt)}</p>
                </section>
              </div>
            )}

            {contact?.conversation && (
              <div className="border-t border-border p-4">
                <Button asChild className="w-full">
                  <Link href={`/dashboard/inbox?c=${contact.conversation.id}`}>
                    <MessageCircle className="h-4 w-4" /> Open conversation
                  </Link>
                </Button>
              </div>
            )}
          </aside>
        </>
      )}
      <LostReasonDialog
        open={lostPrompt}
        leadName={contact?.displayName}
        loading={setStage.isPending}
        onCancel={() => {
          setLostPrompt(false);
          setPendingStage(null);
        }}
        onConfirm={(reason) => {
          if (pendingStage) {
            setStage.mutate(
              { stage: pendingStage, reason },
              {
                onSuccess: () => {
                  setLostPrompt(false);
                  setPendingStage(null);
                },
              },
            );
          }
        }}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
