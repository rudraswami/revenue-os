"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { applySession, postAuthPath } from "@/lib/auth-session";
import { CTA } from "@/lib/brand-copy";
import type { AuthSession } from "@/lib/auth-types";

function passwordStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "", width: "0%" };
  if (password.length < 8) return { label: "Too short", color: "bg-warning", width: "33%" };
  if (password.length < 12) return { label: "Good", color: "bg-accent", width: "66%" };
  return { label: "Strong", color: "bg-accent", width: "100%" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);

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
      badge="14-day free trial"
      title="Create your workspace"
      description="Start free — explore the dashboard, then connect WhatsApp when you're ready."
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <AuthField
          id="organizationName"
          name="organizationName"
          label="Company name"
          icon={Building2}
          placeholder="Acme Retail"
          autoComplete="organization"
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <AuthField
            id="name"
            name="name"
            label="Your name"
            icon={User}
            placeholder="Jane Smith"
            autoComplete="name"
            required
          />
          <AuthField
            id="email"
            name="email"
            label="Work email"
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <AuthField
            id="password"
            name="password"
            label="Password"
            type="password"
            icon={Lock}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="h-1 overflow-hidden rounded-full bg-[#dce9ff]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{strength.label}</p>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" variant="accent" className="auth-submit" disabled={loading}>
          {loading ? "Creating workspace…" : CTA.startTrial}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-muted-foreground">
        <span>No credit card required</span>
        <span className="hidden sm:inline">·</span>
        <span>Connect WhatsApp anytime from Settings</span>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
