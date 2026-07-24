"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MessageTemplateStarter, MessageTemplateView } from "@growvisi/shared";
import { defaultTemplateNameFromStarter, sanitizeTemplateName } from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/toast";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { TemplateCreateDialog } from "./template-create-dialog";
import { TemplateEditDialog } from "./template-edit-dialog";
import {
  TemplateListSection,
  type TemplateStatusFilter,
} from "./template-list-section";
import { EYEBROW, NAV, TEMPLATES } from "@/lib/brand-copy";

type TemplatesResponse = {
  templates: MessageTemplateView[];
  syncedAt: string;
  counts: { total: number; approved: number; pending: number; rejected: number };
};

type StartersResponse = { starters: MessageTemplateStarter[] };

export function TemplateManagementView() {
  const token = useAuthStore((s) => s.accessToken);
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<TemplateStatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("UTILITY");
  const [language, setLanguage] = useState("en");
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplateView | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("UTILITY");
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplateView | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["message-templates", filter],
    queryFn: () =>
      apiFetch<TemplatesResponse>(`/message-templates?status=${filter}`, {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 60_000,
    refetchInterval: (query) => {
      const pending = query.state.data?.counts?.pending ?? 0;
      return pending > 0 ? 60_000 : false;
    },
  });

  const { data: startersData } = useQuery({
    queryKey: ["message-template-starters"],
    queryFn: () =>
      apiFetch<StartersResponse>("/message-templates/starters", {
        token: token ?? undefined,
      }),
    enabled: !!token && createOpen,
    staleTime: 24 * 60 * 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; approvedTemplateCount?: number }>("/message-templates/sync", {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      success(TEMPLATES.refreshSuccess);
    },
    onError: (err: Error) => toastError(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ template: MessageTemplateView; message: string }>("/message-templates", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          name: sanitizeTemplateName(name),
          body: body.trim(),
          category,
          language,
          starterId: selectedStarterId ?? undefined,
        }),
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setCreateOpen(false);
      resetCreateForm();
      success(res.message);
    },
    onError: (err: Error) => toastError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingTemplate?.metaTemplateId) {
        throw new Error("Template ID missing. Refresh the list and try again.");
      }
      return apiFetch<{ template: MessageTemplateView; message: string }>("/message-templates/edit", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({
          name: editingTemplate.name,
          language: editingTemplate.language,
          metaTemplateId: editingTemplate.metaTemplateId,
          body: editBody.trim(),
          category: editCategory,
        }),
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setEditingTemplate(null);
      success(res.message);
    },
    onError: (err: Error) => toastError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: MessageTemplateView) =>
      apiFetch<{ ok: boolean; message: string }>(
        `/message-templates?name=${encodeURIComponent(target.name)}&language=${encodeURIComponent(target.language)}${target.metaTemplateId ? `&metaTemplateId=${encodeURIComponent(target.metaTemplateId)}` : ""}`,
        {
          method: "DELETE",
          token: token ?? undefined,
        },
      ),
    onSuccess: (res, target) => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setDeleteTarget(null);
      if (editingTemplate?.name === target.name && editingTemplate.language === target.language) {
        setEditingTemplate(null);
      }
      success(res.message);
    },
    onError: (err: Error) => toastError(err.message),
  });

  function resetCreateForm() {
    setSelectedStarterId(null);
    setName("");
    setBody("");
    setCategory("UTILITY");
    setLanguage("en");
  }

  function openCreate(starter?: MessageTemplateStarter) {
    if (starter) {
      setSelectedStarterId(starter.id);
      setName(defaultTemplateNameFromStarter(starter.id));
      setBody(starter.body);
      setCategory(starter.category);
      setLanguage(starter.language);
    } else {
      resetCreateForm();
    }
    setCreateOpen(true);
  }

  function openEdit(template: MessageTemplateView) {
    setEditingTemplate(template);
    setEditBody(template.bodyText || template.bodyPreview);
    setEditCategory(
      (template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION") ?? "UTILITY",
    );
  }

  const counts = data?.counts;
  const pendingCount = counts?.pending ?? 0;

  return (
    <div className="dashboard-page max-w-6xl px-4 py-6 lg:px-8">
      <PageHeader
        eyebrow={EYEBROW.automate}
        title={TEMPLATES.title}
        description={
          <>
            {TEMPLATES.description.split("Campaigns")[0]}
            <Link href="/dashboard/campaigns" className="font-medium text-accent hover:underline">
              {NAV.campaigns}
            </Link>
            .
          </>
        }
      />

      {pendingCount > 0 && (
        <p className="-mt-4 mb-5 rounded-xl border border-warning/25 bg-warning/8 px-4 py-2.5 text-sm text-foreground">
          {TEMPLATES.pendingNote(pendingCount)}
        </p>
      )}

      <TemplateListSection
        templates={data?.templates ?? []}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        isLoading={isLoading}
        isError={isError}
        isRefreshing={syncMutation.isPending || isFetching}
        lastSyncedAt={data?.syncedAt}
        onRetry={() => void refetch()}
        onRefresh={() => syncMutation.mutate()}
        onCreate={() => openCreate()}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <TemplateCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
        starters={startersData?.starters ?? []}
        selectedStarterId={selectedStarterId}
        onSelectStarter={(starter) => setSelectedStarterId(starter?.id ?? null)}
        name={name}
        onNameChange={setName}
        body={body}
        onBodyChange={setBody}
        category={category}
        onCategoryChange={setCategory}
        language={language}
        onLanguageChange={setLanguage}
        onSubmit={() => createMutation.mutate()}
        isPending={createMutation.isPending}
      />

      <TemplateEditDialog
        template={editingTemplate}
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        body={editBody}
        onBodyChange={setEditBody}
        category={editCategory}
        onCategoryChange={setEditCategory}
        onSubmit={() => updateMutation.mutate()}
        isPending={updateMutation.isPending}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={
          deleteTarget?.status === "APPROVED"
            ? TEMPLATES.deleteApprovedTitle
            : TEMPLATES.deleteTitle
        }
        description={
          deleteTarget?.status === "APPROVED"
            ? TEMPLATES.deleteApprovedBody(deleteTarget.name, deleteTarget.language)
            : deleteTarget
              ? TEMPLATES.deleteBody(deleteTarget.name, deleteTarget.language)
              : ""
        }
        confirmLabel={TEMPLATES.deleteConfirm}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}
