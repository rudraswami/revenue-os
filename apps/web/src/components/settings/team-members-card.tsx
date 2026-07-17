"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Mail, Trash2, UserPlus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError, isUpgradeFrictionError, toUserMessage } from "@/lib/api-client";
import { UpgradeFrictionBanner } from "@/components/dashboard/upgrade-friction-banner";
import { formatRelative } from "@/lib/crm";
import { canManageTeam, INVITE_ROLES, ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole } from "@growvisi/shared";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

interface MemberRow {
  id: string;
  role: MembershipRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    lastLoginAt: string | null;
  };
}

interface InviteRow {
  id: string;
  email: string;
  role: MembershipRole;
  expiresAt: string;
  createdAt: string;
}

export function TeamMembersCard() {
  const token = useAuthStore((s) => s.accessToken);
  const myRole = useAuthStore((s) => s.role);
  const myUserId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("AGENT");
  const [sent, setSent] = useState<string | null>(null);
  const isAdmin = canManageTeam(myRole);

  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members"],
    queryFn: () => apiFetch<MemberRow[]>("/organizations/members", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: invites } = useQuery({
    queryKey: ["organization-invites"],
    queryFn: () => apiFetch<InviteRow[]>("/organizations/invites", { token: token ?? undefined }),
    enabled: !!token && isAdmin,
  });

  const { data: limits } = useQuery({
    queryKey: ["team-limits"],
    queryFn: () =>
      apiFetch<{ memberCount: number; pendingInvites: number; limit: number; canInvite: boolean }>(
        "/organizations/team-limits",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { email: string; role: MembershipRole }) =>
      apiFetch<{ sent: boolean; email: string }>("/organizations/invites", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      setSent(res.email);
      setEmail("");
      success(t("toast.inviteSent"));
      void queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      void queryClient.invalidateQueries({ queryKey: ["team-limits"] });
    },
    onError: (e) => {
      toastError(toUserMessage(e, t("toast.actionFailed")));
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MembershipRole }) =>
      apiFetch(`/organizations/members/${memberId}/role`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      success(t("toast.roleUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: (e) => {
      toastError(toUserMessage(e, t("toast.actionFailed")));
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/organizations/members/${memberId}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      success(t("toast.memberRemoved"));
      void queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      void queryClient.invalidateQueries({ queryKey: ["team-limits"] });
    },
    onError: (e) => {
      toastError(toUserMessage(e, t("toast.actionFailed")));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch(`/organizations/invites/${inviteId}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      success(t("toast.inviteRevoked"));
      void queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      void queryClient.invalidateQueries({ queryKey: ["team-limits"] });
    },
    onError: (e) => {
      toastError(toUserMessage(e, t("toast.actionFailed")));
    },
  });

  const inviteForm = isAdmin ? (
    <form
      className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        const v = email.trim();
        if (!v || inviteMutation.isPending || limits?.canInvite === false) return;
        inviteMutation.mutate({ email: v, role: inviteRole });
      }}
    >
      <Input
        type="email"
        placeholder="teammate@company.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setSent(null);
        }}
        className="h-9 flex-1 text-sm"
      />
      <Select
        value={inviteRole}
        onChange={(e) => setInviteRole(e.target.value as MembershipRole)}
        className="h-9 w-full text-xs sm:w-28"
      >
        {INVITE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <Button
        type="submit"
        size="sm"
        className="shrink-0 rounded-xl"
        disabled={inviteMutation.isPending || limits?.canInvite === false}
      >
        {inviteMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </>
        )}
      </Button>
    </form>
  ) : null;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="rounded-xl border border-border/70 bg-background/50 p-4">
          {inviteForm}
          {limits?.canInvite === false && (
            <UpgradeFrictionBanner
              className="mt-3"
              compact
              reason="seats"
              message={`Your plan allows ${limits.limit} team member(s). Upgrade to invite more.`}
              limit={limits.limit}
              used={limits.memberCount + limits.pendingInvites}
              suggestedPlan={limits.limit <= 2 ? "growth" : "pro"}
            />
          )}
          {sent && (
            <p className="mt-2 text-xs font-medium text-accent">
              Invite sent to {sent} — valid for 7 days.
            </p>
          )}
          {inviteMutation.isError &&
            (isUpgradeFrictionError(inviteMutation.error) ? (
              <UpgradeFrictionBanner
                className="mt-3"
                compact
                reason={inviteMutation.error.meta?.reason ?? "seats"}
                message={toUserMessage(inviteMutation.error, "Could not send invite.")}
                suggestedPlan={inviteMutation.error.meta?.suggestedPlan}
                limit={inviteMutation.error.meta?.limit}
                used={inviteMutation.error.meta?.used}
              />
            ) : (
              <p className="mt-2 text-xs text-destructive">
                {toUserMessage(inviteMutation.error, "Could not send invite.")}
              </p>
            ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/80">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_100px_100px_72px] gap-3 border-b border-border/70 bg-background px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
          <span>Member</span>
          <span>Email</span>
          <span>Role</span>
          <span>Last active</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="space-y-0 divide-y divide-border/60 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {(members ?? []).map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_100px_100px_72px] md:items-center md:gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarInitials name={m.user.name ?? m.user.email} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.user.name ?? m.user.email.split("@")[0]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {m.user.email}
                    </p>
                  </div>
                </div>
                <p className="hidden truncate text-sm text-muted-foreground md:block">
                  {m.user.email}
                </p>
                <div>
                  {isAdmin && m.role !== "OWNER" && m.user.id !== myUserId ? (
                    <Select
                      value={m.role}
                      onChange={(e) =>
                        roleMutation.mutate({
                          memberId: m.id,
                          role: e.target.value as MembershipRole,
                        })
                      }
                      className="h-8 w-full text-xs"
                      disabled={roleMutation.isPending}
                    >
                      {INVITE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <RoleBadge role={m.role} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.user.lastLoginAt ? formatRelative(m.user.lastLoginAt) : "—"}
                </p>
                <div className="flex justify-end">
                  {isAdmin && m.role !== "OWNER" && m.user.id !== myUserId ? (
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(m.id)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isAdmin && (invites?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Pending invites
          </p>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/80">
            {invites!.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 bg-card px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[inv.role]} · expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate(inv.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Revoke invite"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isAdmin && myRole && (
        <p className="text-sm text-muted-foreground">
          Your role: <span className="font-semibold text-foreground">{ROLE_LABELS[myRole]}</span>
          . Contact a workspace admin to change roles or invite teammates.
        </p>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: MembershipRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        role === "OWNER"
          ? "bg-amber-50 text-amber-800"
          : "bg-muted text-muted-foreground",
      )}
    >
      {role === "OWNER" ? (
        <Crown className="h-3 w-3" />
      ) : (
        <UserRound className="h-3 w-3" />
      )}
      {ROLE_LABELS[role]}
    </span>
  );
}
