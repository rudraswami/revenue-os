"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean; message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        skipAuthRetry: true,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your work email and we'll send a secure reset link."
    >
      {sent ? (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ecfdf5] text-accent">
            <Mail className="h-5 w-5" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            If an account exists for that email, we sent a reset link. Check your inbox and spam
            folder.
          </p>
          <Button variant="accent" className="auth-submit" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <AuthField
            id="email"
            type="email"
            label="Work email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="accent" className="auth-submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
