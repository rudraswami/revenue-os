"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthPageTransition } from "@/components/auth/auth-page-transition";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, toUserMessage } from "@/lib/api-client";
import { applySession, postAuthPath } from "@/lib/auth-session";
import type { AuthSession } from "@/lib/auth-types";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { MembershipRole } from "@growvisi/shared";

function InviteAcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);

  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () =>
      apiFetch<{ organizationName: string; email: string; role: MembershipRole }>(
        `/organizations/invites/preview?token=${encodeURIComponent(token)}`,
      ),
    enabled: token.length > 0,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiFetch<AuthSession & { alreadyMember?: boolean }>("/organizations/invites/accept", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ token }),
      }),
    onSuccess: (session) => {
      applySession(session);
      router.push(postAuthPath(session.onboarding));
    },
    onError: (e) => {
      setError(toUserMessage(e, "Could not accept invite."));
    },
  });

  const emailMismatch =
    !!accessToken &&
    !!preview &&
    !!user?.email &&
    user.email.toLowerCase() !== preview.email.toLowerCase();

  const roleLabel = preview ? ROLE_LABELS[preview.role] ?? preview.role : "";

  if (!token) {
    return (
      <AuthPageTransition>
        <AuthShell title="Invalid invite" description="This invite link is missing a token.">
          <Button asChild className="auth-submit-modern">
            <Link href="/login">Sign in</Link>
          </Button>
        </AuthShell>
      </AuthPageTransition>
    );
  }

  if (isLoading) {
    return (
      <AuthPageTransition>
        <AuthShell title="Loading invite…" description="Verifying your team invitation.">
          <p className="text-sm text-muted-foreground">One moment…</p>
        </AuthShell>
      </AuthPageTransition>
    );
  }

  if (isError || !preview) {
    return (
      <AuthPageTransition>
        <AuthShell title="Invite expired" description="This link is invalid or has expired.">
          <Button asChild className="auth-submit-modern">
            <Link href="/login">Sign in</Link>
          </Button>
        </AuthShell>
      </AuthPageTransition>
    );
  }

  if (!accessToken) {
    return (
      <AuthPageTransition>
        <AuthShell
          title={`Join ${preview.organizationName}`}
          description={`Invited as ${roleLabel}. Use ${preview.email} to continue.`}
        >
          <div className="flex flex-col gap-3">
            <Button asChild className="auth-submit-modern">
              <Link href={`/register?invite=${token}&email=${encodeURIComponent(preview.email)}`}>
                Create account
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-xl">
              <Link href={`/login?invite=${token}&email=${encodeURIComponent(preview.email)}`}>
                Sign in
              </Link>
            </Button>
          </div>
        </AuthShell>
      </AuthPageTransition>
    );
  }

  return (
    <AuthPageTransition>
      <AuthShell
        title={`Join ${preview.organizationName}`}
        description={
          emailMismatch
            ? `You're signed in as ${user?.email}. Sign out and use ${preview.email} to accept.`
            : `Accept to switch into the ${preview.organizationName} workspace as ${roleLabel}.`
        }
      >
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {emailMismatch ? (
          <Button asChild variant="outline" className="h-12 rounded-xl">
            <Link href={`/login?invite=${token}&email=${encodeURIComponent(preview.email)}`}>
              Switch account
            </Link>
          </Button>
        ) : (
          <Button
            className="auth-submit-modern"
            isLoading={acceptMutation.isPending}
            disabled={acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            {acceptMutation.isPending ? "Joining…" : "Accept invite"}
          </Button>
        )}
      </AuthShell>
    </AuthPageTransition>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#fafbfc]">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
