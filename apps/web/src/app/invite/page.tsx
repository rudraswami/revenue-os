"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

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
      apiFetch<{ organizationName: string; email: string; role: string }>(
        `/organizations/invites/preview?token=${encodeURIComponent(token)}`,
      ),
    enabled: token.length > 0,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiFetch("/organizations/invites/accept", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ token }),
      }),
    onSuccess: () => router.push("/dashboard"),
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not accept invite.");
    },
  });

  const emailMismatch =
    !!accessToken &&
    !!preview &&
    !!user?.email &&
    user.email.toLowerCase() !== preview.email.toLowerCase();

  if (!token) {
    return (
      <AuthShell title="Invalid invite" description="This invite link is missing a token.">
        <Button asChild variant="accent" className="auth-submit">
          <Link href="/login">Sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  if (isLoading) {
    return (
      <AuthShell title="Loading invite…" description="Verifying your team invitation.">
        <p className="text-sm text-muted-foreground">One moment…</p>
      </AuthShell>
    );
  }

  if (isError || !preview) {
    return (
      <AuthShell title="Invite expired" description="This link is invalid or has expired.">
        <Button asChild variant="accent" className="auth-submit">
          <Link href="/login">Sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  if (!accessToken) {
    return (
      <AuthShell
        title={`Join ${preview.organizationName}`}
        description={`Invited as ${preview.role.toLowerCase()}. Use ${preview.email} to continue.`}
      >
        <div className="flex flex-col gap-3">
          <Button asChild variant="accent" className="auth-submit">
            <Link href={`/register?invite=${token}&email=${encodeURIComponent(preview.email)}`}>
              Create account
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/login?invite=${token}&email=${encodeURIComponent(preview.email)}`}>
              Sign in
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Join ${preview.organizationName}`}
      description={
        emailMismatch
          ? `You're signed in as ${user?.email}. Sign out and use ${preview.email} to accept.`
          : `Accept to switch into the ${preview.organizationName} workspace.`
      }
    >
      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {emailMismatch ? (
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/login">Switch account</Link>
        </Button>
      ) : (
        <Button
          variant="accent"
          className="auth-submit"
          disabled={acceptMutation.isPending}
          onClick={() => acceptMutation.mutate()}
        >
          {acceptMutation.isPending ? "Joining…" : "Accept invite"}
        </Button>
      )}
    </AuthShell>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f8f9ff]">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <InviteAcceptForm />
    </Suspense>
  );
}
