"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Crown, Loader2, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

interface MemberRow {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    lastLoginAt: string | null;
  };
}

export function TeamMembersCard() {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members"],
    queryFn: () => apiFetch<MemberRow[]>("/organizations/members", { token: token ?? undefined }),
    enabled: !!token,
  });

  const inviteMutation = useMutation({
    mutationFn: (inviteEmail: string) =>
      apiFetch<{ sent: boolean; email: string }>("/organizations/invites", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ email: inviteEmail, role: "AGENT" }),
      }),
    onSuccess: (res) => {
      setSent(res.email);
      setEmail("");
      void queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Team</p>
        <span className="text-xs text-muted-foreground">
          {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = email.trim();
          if (!v || inviteMutation.isPending) return;
          inviteMutation.mutate(v);
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
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" className="shrink-0 rounded-xl" disabled={inviteMutation.isPending}>
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

      {sent && (
        <p className="text-xs text-accent">Invite sent to {sent} — valid for 7 days.</p>
      )}
      {inviteMutation.isError && (
        <p className="text-xs text-destructive">
          {inviteMutation.error instanceof ApiError ? inviteMutation.error.message : "Could not send invite."}
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
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {m.role === "OWNER" ? <Crown className="h-3 w-3 text-amber-600" /> : <UserRound className="h-3 w-3" />}
                {m.role.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Need more seats or SSO?{" "}
        <Link href="/contact" className="font-medium text-accent hover:underline">
          Contact us for Enterprise
        </Link>
        .
      </p>
    </div>
  );
}
