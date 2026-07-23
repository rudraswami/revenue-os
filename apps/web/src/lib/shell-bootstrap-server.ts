import type { ShellBootstrapResponse } from "@/lib/shell-bootstrap";
import { resolveApiBaseUrl } from "@/lib/growvisi-host";

const REFRESH_COOKIE = "growvisi_rt";
const SESSION_COOKIE = "growvisi-session";

/**
 * Server-side shell bootstrap for dashboard RSC (P2).
 * Uses HttpOnly refresh cookie — avoids client waterfall on first paint.
 */
export async function fetchShellBootstrapServer(
  cookieHeader: string | null | undefined,
  requestHost?: string | null,
): Promise<ShellBootstrapResponse | null> {
  if (!cookieHeader?.includes(`${SESSION_COOKIE}=1`)) return null;
  if (!cookieHeader.includes(`${REFRESH_COOKIE}=`)) return null;

  const api = resolveApiBaseUrl(requestHost);

  // Streamed (non-blocking) from the dashboard layout — must never reject, or a
  // slow/broken API would break the page instead of letting the client cache +
  // client bootstrap take over.
  try {
    const refreshRes = await fetch(`${api}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });
    if (!refreshRes.ok) return null;

    const session = (await refreshRes.json().catch(() => null)) as {
      accessToken?: string;
    } | null;
    if (!session?.accessToken) return null;

    const bootstrapRes = await fetch(`${api}/organizations/shell-bootstrap`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!bootstrapRes.ok) return null;

    return (await bootstrapRes.json()) as ShellBootstrapResponse;
  } catch {
    return null;
  }
}
