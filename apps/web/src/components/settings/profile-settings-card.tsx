"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { applySession } from "@/lib/auth-session";
import type { MeResponse } from "@/lib/auth-types";
import { useAuthStore } from "@/stores/auth-store";

export function ProfileSettingsCard() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<MeResponse>("/auth/me", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ name: name.trim() }),
      }),
    onSuccess: (me) => {
      const current = useAuthStore.getState();
      applySession({
        accessToken: current.accessToken!,
        refreshToken: current.refreshToken!,
        user: me.user,
        organization: me.organization,
        role: me.role,
        onboarding: me.onboarding,
      });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Could not update profile.");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Your profile</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Name shown in the workspace sidebar.</p>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="profile-name">
          Display name
        </label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl"
          placeholder="Your name"
        />
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {saved && <p className="text-xs text-accent">Profile saved.</p>}
      <Button
        type="button"
        size="sm"
        variant="accent"
        className="rounded-xl"
        disabled={!name.trim() || mutation.isPending || !token}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
