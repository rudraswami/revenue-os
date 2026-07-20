"use client";

import { memo, useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Check, CheckSquare, Plus, Trash2 } from "lucide-react";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
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
import { canManageCampaigns, canAssignTasksToOthers, canViewTeamTasks, canWrite } from "@/lib/permissions";
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
  const myUserId = useAuthStore((s) => s.user?.id);
  const canEdit = canWrite(role);
  const canDelete = canManageCampaigns(role);
  const canAssignOthers = canAssignTasksToOthers(role);
  const showTeamScope = canViewTeamTasks(role);
  const canEditTaskAssignee = (task: TaskRow) =>
    canAssignOthers ||
    (!task.assignedTo?.id && canEdit) ||
    (task.assignedTo?.id === myUserId && canEdit);
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();
  const [scope, setScope] = useState<"mine" | "open" | "all">(showTeamScope ? "open" : "mine");
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

  type TaskListSnapshot = Array<[QueryKey, TaskRow[] | undefined]>;

  async function patchTaskLists(
    updater: (list: TaskRow[]) => TaskRow[],
  ): Promise<{ snapshot: TaskListSnapshot }> {
    await qc.cancelQueries({ queryKey: ["tasks"] });
    const snapshot = qc.getQueriesData<TaskRow[]>({ queryKey: ["tasks"] });
    for (const [key, list] of snapshot) {
      if (!list) continue;
      qc.setQueryData<TaskRow[]>(key, updater(list));
    }
    return { snapshot };
  }

  function rollbackTaskLists(context: { snapshot: TaskListSnapshot } | undefined) {
    context?.snapshot.forEach(([key, val]) => qc.setQueryData(key, val));
  }

  const createTask = useMutation({
    mutationFn: (vars: {
      title: string;
      priority: TaskPriority;
      assignedToId?: string;
      dueAt?: string;
    }) =>
      apiFetch("/tasks", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify(vars),
      }),
    onMutate: async (vars) => {
      // Clear the form immediately and show the task optimistically.
      setTitle("");
      setDue("");
      setAssignee("");
      setPriority("MEDIUM");
      const member = members?.find((m) => m.user.id === vars.assignedToId)?.user;
      const optimistic: TaskRow = {
        id: `temp-${Date.now()}`,
        title: vars.title,
        status: "OPEN",
        priority: vars.priority,
        dueAt: vars.dueAt ?? null,
        assignedTo: vars.assignedToId
          ? { id: vars.assignedToId, name: member?.name ?? null, email: member?.email ?? "" }
          : null,
        lead: null,
      };
      const { snapshot } = await patchTaskLists((list) => [optimistic, ...list]);
      return { snapshot };
    },
    onSuccess: () => {
      success(t("toast.taskCreated"));
    },
    onError: (_e, _vars, context) => {
      rollbackTaskLists(context as { snapshot: TaskListSnapshot } | undefined);
      toastError(t("toast.actionFailed"));
    },
    onSettled: () => invalidate(),
  });

  function submitNewTask() {
    const trimmed = title.trim();
    if (!trimmed) return;
    createTask.mutate({
      title: trimmed,
      priority,
      assignedToId: assignee || undefined,
      dueAt: due ? new Date(due).toISOString() : undefined,
    });
  }

  const toggle = useOptimisticMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ status }),
      }),
    optimisticUpdate: (_qc, { id, status }) =>
      patchTaskLists((list) => list.map((task) => (task.id === id ? { ...task, status } : task))),
    rollback: (_qc, context) => rollbackTaskLists(context),
    reconcile: () => invalidate(),
    errorMessage: t("toast.actionFailed"),
  });

  const reassign = useOptimisticMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      apiFetch(`/tasks/${id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      }),
    optimisticUpdate: (_qc, { id, assignedToId }) => {
      const member = members?.find((m) => m.user.id === assignedToId)?.user;
      const assignedTo = assignedToId
        ? { id: assignedToId, name: member?.name ?? null, email: member?.email ?? "" }
        : null;
      return patchTaskLists((list) =>
        list.map((task) => (task.id === id ? { ...task, assignedTo } : task)),
      );
    },
    rollback: (_qc, context) => rollbackTaskLists(context),
    reconcile: () => invalidate(),
    errorMessage: t("toast.actionFailed"),
  });

  const removeTask = useOptimisticMutation({
    mutationFn: (id: string) =>
      apiFetch(`/tasks/${id}`, { method: "DELETE", token: token ?? undefined }),
    optimisticUpdate: (_qc, id) =>
      patchTaskLists((list) => list.filter((task) => task.id !== id)),
    rollback: (_qc, context) => rollbackTaskLists(context),
    reconcile: () => invalidate(),
    errorMessage: t("toast.actionFailed"),
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
            submitNewTask();
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
          {canAssignOthers && (
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
          )}
          <Field label="Due" className="sm:col-span-2 md:col-span-1">
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="h-9 text-sm"
            />
          </Field>
          <Button type="submit" size="sm" disabled={!title.trim()} isLoading={createTask.isPending}>
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
            ...(showTeamScope ? [{ value: "all" as const, label: "All" }] : []),
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
            {tasks!.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                canEdit={canEdit}
                canDelete={canDelete}
                canEditAssignee={canEdit && canEditTaskAssignee(task)}
                members={members}
                onToggle={toggle.mutate}
                onReassign={reassign.mutate}
                onRemove={removeTask.mutate}
              />
            ))}
          </ul>
        )}
      </DashboardPanel>
    </div>
  );
}

const TaskItem = memo(function TaskItem({
  task,
  canEdit,
  canDelete,
  canEditAssignee,
  members,
  onToggle,
  onReassign,
  onRemove,
}: {
  task: TaskRow;
  canEdit: boolean;
  canDelete: boolean;
  canEditAssignee: boolean;
  members?: Array<{ user: TeamMember }>;
  onToggle: (args: { id: string; status: TaskStatus }) => void;
  onReassign: (args: { id: string; assignedToId: string }) => void;
  onRemove: (id: string) => void;
}) {
  const done = task.status === "DONE";
  const overdue = !done && !!task.dueAt && new Date(task.dueAt).getTime() < Date.now();
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      {canEdit ? (
        <button
          type="button"
          onClick={() => onToggle({ id: task.id, status: done ? "OPEN" : "DONE" })}
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
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("rounded-full px-1.5 py-0.5 text-xs font-semibold", PRIORITY_BADGE[task.priority])}>
            {task.priority}
          </span>
          {task.lead && <span className="truncate">{task.lead.displayName ?? task.lead.phone}</span>}
          {task.dueAt && (
            <span className={cn(overdue && "font-semibold text-destructive")}>
              Due {formatDate(task.dueAt)}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.assignedTo && (
          <AvatarInitials name={task.assignedTo.name ?? task.assignedTo.email} size="sm" />
        )}
        {canEditAssignee ? (
          <Select
            value={task.assignedTo?.id ?? ""}
            onChange={(e) => onReassign({ id: task.id, assignedToId: e.target.value })}
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
          task.assignedTo && (
            <span className="text-xs text-muted-foreground">
              {task.assignedTo.name ?? task.assignedTo.email}
            </span>
          )
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => onRemove(task.id)}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  );
});

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
