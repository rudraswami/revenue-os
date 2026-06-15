"use client";

import { useEffect } from "react";

/**
 * Meta OAuth redirect target for WhatsApp Embedded Signup.
 * Receives ?code=…&state=… and postMessages the code to the opener window.
 */
export default function MetaOAuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") ?? undefined;
    const state = params.get("state") ?? undefined;
    const error =
      params.get("error_description") ??
      params.get("error_reason") ??
      params.get("error") ??
      undefined;

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: "META_OAUTH_CALLBACK",
          code,
          error,
          state,
        },
        window.location.origin,
      );
    }

    window.setTimeout(() => window.close(), 300);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <p>Completing Facebook login… this window will close automatically.</p>
    </main>
  );
}
