"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckSquare, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-state";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/locale-provider";
import { canManageCampaigns, canWrite } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import {
  formatDate,
  PRIORITY_BADGE,
  TASK_PRIORITIES,
  type TaskPriority,
  type TaskStatus,
  type TeamMember,
} from "@/lib/crm";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TeamWorkloadPanel } from "@/components/dashboard/team-workload-panel";

interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
  assignedTo?: { id: string; name?: string | null; email: string } | null;
  lead?: { id: string; displayName?: string | null; phone: string } | null;
}

export default function TasksPage() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canEdit = canWrite(role);
  const canDelete = canManageCampaigns(role);
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();
  const [scope, setScope] = useState<"mine" | "open" | "all">("open");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");

  const taskParams = new URLSearchParams();
  if (scope === "mine") taskParams.set("mine", "true");
  if (scope === "all") taskParams.set("scope", "all");

  const { data: tasks, isLoading, isError, refetch } = useQuery({
    queryKey: ["tasks", scope],
    queryFn: () =>
      apiFetch<TaskRow[]>(`/tasks?${taskParams.toString()}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: summary } = useQuery({
    queryKey: ["tasks-summary"],
    queryFn: () =>
      apiFetch<{ open: number; dueToday: number; overdue: number; mine: number }>("/tasks/summary", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: members } = useQuery({
    queryKey: ["org-members"],
    queryFn: () =>
      apiFetch<Array<{ user: TeamMember }>>("/organizations/members", { token: token ?? undefined }),
    enabled: !!token,
  });

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["tasks"] });
    void qc.invalidateQueries({ queryKey: ["tasks-summary"] });
  }

  const createTask = useMutation({
    mutationFn: () =>
      apiFetch("/tasks", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          title: title.trim(),
          priority,
          assignedToId: assignee || undefined,
          dueAt: due ? new Date(due).toISOString() : undefined,
        }),
      }),
    onSuccess: () => {
      setTitle("");
      setDue("");
      setAssignee("");
      setPriority("MEDIUM");
      success(t("toast.taskCreated"));
      invalidate();
    },
    onError: () => toastError(t("toast.actionFailed")),
  });

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ status }),
      }),
    onSuccess: invalidate,
  });

  const reassign = useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      }),
    onSuccess: invalidate,
  });

  const removeTask = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tasks/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: invalidate,
  });

  const total = tasks?.length ?? 0;

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Tasks"
        description="Assign follow-ups to your team so no WhatsApp lead goes cold. Tasks link straight to contacts."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Open" value={summary?.open ?? 0} />
        <StatCard label="Due today" value={summary?.dueToday ?? 0} />
        <StatCard label="Overdue" value={summary?.overdue ?? 0} danger={(summary?.overdue ?? 0) > 0} />
        <StatCard label="Assigned to me" value={summary?.mine ?? 0} accent />
      </div>

      <div className="mb-6">
        <TeamWorkloadPanel />
      </div>

      {canEdit && (
      <DashboardPanel className="mb-6" title="New task">
        <form
          className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) createTask.mutate();
          }}
        >
          <Field label="Task">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call back about pricing…"
              className="h-9 text-sm"
            />
          </Field>
          <Field label="Priority">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="h-9 text-sm"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0] + p.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
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
          <Field label="Due" className="sm:col-span-2 md:col-span-1">
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="h-9 text-sm"
            />
          </Field>
          <Button type="submit" size="sm" disabled={!title.trim() || createTask.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>
      </DashboardPanel>
      )}

      <div className="mb-4">
        <SegmentedControl
          aria-label="Task scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: "open", label: "Open" },
            { value: "mine", label: "My tasks" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <DashboardPanel noPadding>
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-5">
            <QueryErrorState title="Couldn't load tasks" onRetry={() => void refetch()} />
          </div>
        ) : total === 0 ? (
          <EmptyState
            compact
            icon={<CheckSquare className="h-6 w-6" />}
            title="No tasks here"
            description="Create a follow-up above, or add tasks from any contact."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {tasks!.map((t) => {
              const done = t.status === "DONE";
              const overdue =
                !done && t.dueAt && new Date(t.dueAt).getTime() < Date.now();
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  {canEdit ? (
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: t.id, status: done ? "OPEN" : "DONE" })}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                      done
                        ? "border-success bg-success text-white"
                        : "border-border text-transparent hover:border-accent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  ) : (
                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      done ? "border-success bg-success text-white" : "border-border",
                    )}
                  >
                    {done && <Check className="h-3.5 w-3.5" />}
                  </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
                      {t.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-semibold", PRIORITY_BADGE[t.priority])}>
                        {t.priority}
                      </span>
                      {t.lead && (
                        <span className="truncate">{t.lead.displayName ?? t.lead.phone}</span>
                      )}
                      {t.dueAt && (
                        <span className={cn(overdue && "font-semibold text-destructive")}>
                          Due {formatDate(t.dueAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.assignedTo && (
                      <AvatarInitials name={t.assignedTo.name ?? t.assignedTo.email} size="sm" />
                    )}
                    {canEdit ? (
                    <Select
                      value={t.assignedTo?.id ?? ""}
                      onChange={(e) => reassign.mutate({ id: t.id, assignedToId: e.target.value })}
                      className="h-8 w-32 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {(members ?? []).map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.name ?? m.user.email}
                        </option>
                      ))}
                    </Select>
                    ) : (
                      t.assignedTo && (
                        <span className="text-xs text-muted-foreground">
                          {t.assignedTo.name ?? t.assignedTo.email}
                        </span>
                      )
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => removeTask.mutate(t.id)}
                        disabled={removeTask.isPending}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardPanel>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          danger ? "text-destructive" : accent ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
