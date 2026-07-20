import type { ShellBootstrapResponse } from "@/lib/shell-bootstrap";

const REFRESH_COOKIE = "growvisi_rt";
const SESSION_COOKIE = "growvisi-session";

function apiBase(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    "http://127.0.0.1:4000/api/v1"
  ).replace(/\/$/, "");
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
}

/**
 * Server-side shell bootstrap for dashboard RSC (P2).
 * Uses HttpOnly refresh cookie — avoids client waterfall on first paint.
 */
export async function fetchShellBootstrapServer(
  cookieHeader: string | null | undefined,
): Promise<ShellBootstrapResponse | null> {
  if (!cookieHeader?.includes(`${SESSION_COOKIE}=1`)) return null;
  if (!cookieHeader.includes(`${REFRESH_COOKIE}=`)) return null;

  const api = apiBase();

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
}
