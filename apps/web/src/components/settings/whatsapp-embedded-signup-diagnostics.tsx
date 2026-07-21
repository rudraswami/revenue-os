"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getEmbeddedSignupDiagnostics, getEmbeddedSignupLoginPayload } from "@/lib/facebook-sdk";
import { useAuthStore } from "@/stores/auth-store";

interface EmbeddedConfig {
  enabled: boolean;
  embeddedSignupLive: boolean;
  appId: string;
  configId: string;
  graphApiVersion: string;
  solutionId?: string;
  featureType?: string;
}

const SHOW_EMBEDDED_DIAGNOSTICS = true;

export function WhatsappEmbeddedSignupDiagnostics() {
  const token = useAuthStore((s) => s.accessToken);
  const show = SHOW_EMBEDDED_DIAGNOSTICS;

  const { data: config } = useQuery({
    queryKey: ["embedded-signup-config"],
    queryFn: () =>
      apiFetch<EmbeddedConfig>("/whatsapp-accounts/embedded-signup/config", {
        token: token ?? undefined,
      }),
    enabled: !!token && show,
    staleTime: 60_000,
  });

  const { data: diagnose } = useQuery({
    queryKey: ["embedded-signup-diagnose"],
    queryFn: () =>
      apiFetch<{
        checks: Array<{ id: string; ok: boolean; detail: string }>;
        graphApp: { name?: string; app_domains?: string[] } | null;
        graphError: string | null;
      }>("/whatsapp-accounts/embedded-signup/diagnose", { token: token ?? undefined }),
    enabled: !!token && show,
    staleTime: 60_000,
  });

  if (!show) return null;

  if (!config?.enabled) return null;

  const client = getEmbeddedSignupDiagnostics(
    config.appId,
    config.configId,
    config.graphApiVersion,
  );
  const payload = getEmbeddedSignupLoginPayload(
    config.appId,
    config.configId,
    config.graphApiVersion,
    { featureType: config.featureType, solutionId: config.solutionId },
  );

  const failedChecks = diagnose?.checks.filter((c) => !c.ok && c.id !== "feature_unavailable_note") ?? [];

  return (
    <details className="rounded-xl border border-border bg-background/60 text-xs">
      <summary className="cursor-pointer px-4 py-3 font-medium text-foreground">
        Embedded Signup diagnostics (for Meta support)
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3 text-muted-foreground">
        <p>
          <strong className="text-foreground">DevTools tip:</strong> Filter &quot;oauth&quot; on the
          main Growvisi tab shows <em>0 requests</em> — that is normal.{" "}
          <code className="rounded bg-card px-1">FB.login()</code> opens a{" "}
          <strong className="text-foreground">popup</strong>. Inspect the popup window (right-click
          inside the Meta dialog → Inspect → Network).
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-card p-2">
            <p className="font-semibold text-foreground">Browser</p>
            <p>Origin: {client.origin || "—"}</p>
            <p>Domain OK: {client.domainOk ? "yes" : "no"}</p>
            <p>SDK loaded: {client.sdkReady ? "yes" : "on click"}</p>
          </div>
          <div className="rounded-lg bg-card p-2">
            <p className="font-semibold text-foreground">API config</p>
            <p>App ID: {payload.appId}</p>
            <p>Config ID: {payload.configId}</p>
            <p>Graph: {payload.graphApiVersion}</p>
            <p>Live: {config.embeddedSignupLive ? "yes" : "no"}</p>
          </div>
        </div>

        <pre className="max-h-40 overflow-auto rounded-lg bg-card p-2 text-xs leading-relaxed">
          {JSON.stringify(payload.loginOptions, null, 2)}
        </pre>

        {failedChecks.length > 0 && (
          <ul className="space-y-1">
            {failedChecks.map((c) => (
              <li key={c.id} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <span>{c.detail}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
          <p className="font-semibold">If popup says &quot;Feature Unavailable&quot;</p>
          <p className="mt-1 leading-relaxed">
            Growvisi implementation matches Meta docs. Blockers are on Meta&apos;s side: Tech
            Provider approval, <code className="rounded bg-card/80 px-1">public_profile</code>{" "}
            Advanced access, Facebook Login for Business allowed domains, and app roles for your
            Facebook account.
          </p>
          <a
            href="https://developers.facebook.com/apps/1694805491426991/whatsapp-business/wa-embedded-signup/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-warning underline"
          >
            Test in Meta Embedded Signup Integration Helper
            <ExternalLink className="h-3 w-3" />
          </a>
          <p className="mt-1">
            If Integration Helper also fails → Meta app config. If Helper works but Growvisi fails →
            domain / popup / browser issue.
          </p>
        </div>
      </div>
    </details>
  );
}
