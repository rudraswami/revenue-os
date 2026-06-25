"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Crown, Loader2, Trash2, UserPlus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api-client";
import { canManageTeam, INVITE_ROLES, ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole } from "@growvisi/shared";

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
      void queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      void queryClient.invalidateQueries({ queryKey: ["team-limits"] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: MembershipRole }) =>
      apiFetch(`/organizations/members/${memberId}/role`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["organization-members"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiFetch(`/organizations/members/${memberId}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      void queryClient.invalidateQueries({ queryKey: ["team-limits"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiFetch(`/organizations/invites/${inviteId}`, {
        method: "DELETE",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      void queryClient.invalidateQueries({ queryKey: ["team-limits"] });
    },
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Team</p>
        <span className="text-xs text-muted-foreground">
          {limits
            ? `${limits.memberCount}/${limits.limit} seats · ${limits.pendingInvites} pending`
            : `${members?.length ?? 0} members`}
        </span>
      </div>

      {isAdmin && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = email.trim();
            if (!v || inviteMutation.isPending || limits?.canInvite === false) return;
            inviteMutation.mutate({ email: v, role: inviteRole });
          }}
        >
          <div className="flex gap-2">
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
              className="h-9 w-28 text-xs"
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
          </div>
          {limits?.canInvite === false && (
            <p className="text-xs text-amber-700">
              Seat limit reached.{" "}
              <Link href="/dashboard/pricing" className="font-medium underline">
                Upgrade plan
              </Link>
            </p>
          )}
          {sent && <p className="text-xs text-accent">Invite sent to {sent} — valid for 7 days.</p>}
          {inviteMutation.isError && (
            <p className="text-xs text-destructive">
              {inviteMutation.error instanceof ApiError
                ? inviteMutation.error.message
                : "Could not send invite."}
            </p>
          )}
        </form>
      )}

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Your role: <span className="font-semibold">{myRole ? ROLE_LABELS[myRole] : "—"}</span>
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border/80 rounded-xl border border-border/80 bg-[#f8f9ff]/40">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <AvatarInitials name={m.user.name ?? m.user.email} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.user.name ?? m.user.email}</p>
                <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              {isAdmin && m.role !== "OWNER" && m.user.id !== myUserId ? (
                <div className="flex items-center gap-1.5">
                  <Select
                    value={m.role}
                    onChange={(e) =>
                      roleMutation.mutate({ memberId: m.id, role: e.target.value as MembershipRole })
                    }
                    className="h-8 w-24 text-[10px]"
                    disabled={roleMutation.isPending}
                  >
                    {INVITE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeMutation.mutate(m.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.role === "OWNER" ? (
                    <Crown className="h-3 w-3 text-amber-600" />
                  ) : (
                    <UserRound className="h-3 w-3" />
                  )}
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (invites?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pending invites
          </p>
          <ul className="space-y-1.5">
            {invites!.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{inv.email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ROLE_LABELS[inv.role]} · expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate(inv.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Revoke invite"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
