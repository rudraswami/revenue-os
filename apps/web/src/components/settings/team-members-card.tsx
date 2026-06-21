"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Crown, UserRound } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch } from "@/lib/api-client";
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

  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members"],
    queryFn: () => apiFetch<MemberRow[]>("/organizations/members", { token: token ?? undefined }),
    enabled: !!token,
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Team</p>
        <span className="text-xs text-muted-foreground">
          {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>

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
