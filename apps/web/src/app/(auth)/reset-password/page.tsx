"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Invalid reset link. Request a new one.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        skipAuthRetry: true,
      });
      router.replace("/login?reset=1");
    } catch (err) {
      setError(toUserMessage(err, "Could not reset password."));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-destructive">This reset link is invalid or missing.</p>
        <Button className="auth-submit" asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <AuthField
        id="password"
        type="password"
        label="New password"
        icon={Lock}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="Use at least 8 characters with a mix of letters and numbers."
        minLength={8}
        required
      />
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="auth-submit" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" description="Pick a strong password for your workspace.">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
