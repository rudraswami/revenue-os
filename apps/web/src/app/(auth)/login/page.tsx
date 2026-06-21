"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Lock, Mail, User } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { applySession, postAuthPath } from "@/lib/auth-session";
import { CTA } from "@/lib/brand-copy";
import type { AuthSession, LoginResult, OrganizationOption } from "@/lib/auth-types";
import { isAuthSession } from "@/lib/auth-types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetDone = searchParams.get("reset") === "1";
  const deletedDone = searchParams.get("deleted") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitLogin(organizationId?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<LoginResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, organizationId }),
      });

      if (!isAuthSession(res)) {
        setOrganizations(res.organizations);
        setLoading(false);
        return;
      }

      applySession(res as AuthSession);
      setLoading(false);
      const next = searchParams.get("next");
      const safeNext =
        next?.startsWith("/dashboard") || next?.startsWith("/onboarding") ? next : null;
      router.push(safeNext ?? postAuthPath(res.onboarding));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed. Please try again.");
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitLogin();
  }

  return (
    <AuthShell title="Welcome back" description="Sign in to manage WhatsApp leads and your pipeline.">
      {resetDone && (
        <p className="mb-5 rounded-xl border border-success/30 bg-[#ecfdf5] px-3.5 py-2.5 text-sm text-success">
          Password updated. Sign in with your new password.
        </p>
      )}
      {deletedDone && (
        <p className="mb-5 rounded-xl border border-success/30 bg-[#ecfdf5] px-3.5 py-2.5 text-sm text-success">
          Your account was deleted. Sign in with a different account or create a new workspace.
        </p>
      )}
      {!organizations ? (
        <form onSubmit={onSubmit} className="space-y-5">
          <AuthField
            id="email"
            name="email"
            label="Work email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <AuthField
            id="password"
            name="password"
            label="Password"
            type="password"
            icon={Lock}
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            labelExtra={
              <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
                Forgot password?
              </Link>
            }
            required
          />
          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="accent" className="auth-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose a workspace to open:</p>
          <ul className="space-y-2">
            {organizations.map((org) => (
              <li key={org.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start rounded-xl border-[#dce9ff] py-3.5 hover:border-accent/30 hover:bg-[#ecfdf5]/50"
                  disabled={loading}
                  onClick={() => void submitLogin(org.id)}
                >
                  <Building2 className="mr-2 h-4 w-4 text-accent" />
                  <span className="font-medium">{org.name}</span>
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOrganizations(null)}>
            Back
          </Button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          {CTA.createWorkspace}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-[#f8f9ff]">
          <div className="rounded-2xl border border-[#dce9ff] bg-white px-8 py-6 text-sm text-muted-foreground shadow-sm">
            Loading…
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
