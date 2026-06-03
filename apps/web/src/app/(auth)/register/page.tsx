"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { applySession, postAuthPath } from "@/lib/auth-session";
import type { AuthSession } from "@/lib/auth-types";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiFetch<AuthSession>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          organizationName: form.get("organizationName"),
        }),
      });
      applySession(res);
      router.push(postAuthPath(res.onboarding));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your workspace.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      description="Start free — connect WhatsApp and receive customer messages in minutes."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="organizationName" className="mb-1.5 block text-sm font-medium">
            Company name
          </label>
          <Input
            id="organizationName"
            name="organizationName"
            placeholder="Acme Retail"
            autoComplete="organization"
            required
          />
        </div>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Your name
          </label>
          <Input id="name" name="name" placeholder="Jane Smith" autoComplete="name" required />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Work email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full glow-primary" disabled={loading}>
          {loading ? "Creating workspace…" : "Get started free"}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By signing up you agree to use Revenue OS for your business communications.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
