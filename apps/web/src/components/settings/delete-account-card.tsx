"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError } from "@/lib/api-client";
import { logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

export function DeleteAccountCard() {
  const token = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/account", {
        method: "DELETE",
        token: token ?? undefined,
        body: JSON.stringify({ password, confirmation }),
      });
      await logout();
      router.replace("/login?deleted=1");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete account.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = password.length > 0 && confirmation === "DELETE";

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Delete account</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently removes your account and workspace data (conversations, leads, WhatsApp
            connections). This cannot be undone. If your workspace has other members, transfer
            ownership first.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="delete-password" className="mb-1 block text-xs font-medium">
                Current password
              </label>
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="delete-confirm" className="mb-1 block text-xs font-medium">
                Type <span className="font-mono">DELETE</span> to confirm
              </label>
              <Input
                id="delete-confirm"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              disabled={!canSubmit || loading}
              onClick={() => void handleDelete()}
            >
              {loading ? "Deleting…" : "Delete my account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
