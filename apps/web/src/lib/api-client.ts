import type { AuthSession } from "@/lib/auth-types";
import { useAuthStore } from "@/stores/auth-store";

function resolveApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000")
    .replace(/\\r\\n/g, "")
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/\/$/, "");
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
}

const API_URL = resolveApiBase();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const msg = (body as { message?: string | string[] }).message;
  return Array.isArray(msg) ? msg.join(", ") : (msg ?? res.statusText);
}

async function rawFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      `Cannot reach API at ${API_URL}. Start the API: cd growvisi && pnpm dev:api`,
      0,
    );
  }

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        // The refresh token lives in an HttpOnly cookie (sent via credentials:
        // "include"). We only send it in the body as a fallback for the current
        // session before a reload, when it is still held in memory.
        const session = await rawFetch<AuthSession>("/auth/refresh", {
          method: "POST",
          body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
        });
        setSession(session);
        return session.accessToken;
      } catch {
        clear();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string; skipAuthRetry?: boolean } = {},
): Promise<T> {
  const { token: explicitToken, skipAuthRetry, ...init } = options;
  const token = explicitToken ?? useAuthStore.getState().accessToken ?? undefined;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await rawFetch<T>(path, { ...init, headers });
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      token &&
      !skipAuthRetry &&
      !path.startsWith("/auth/")
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryHeaders = new Headers(init.headers);
        retryHeaders.set("Content-Type", "application/json");
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return rawFetch<T>(path, { ...init, headers: retryHeaders });
      }
    }
    throw err;
  }
}

async function authedBlob(path: string, token?: string): Promise<Blob> {
  const authToken = token ?? useAuthStore.getState().accessToken ?? undefined;

  const doFetch = (bearer?: string) => {
    const headers = new Headers();
    if (bearer) headers.set("Authorization", `Bearer ${bearer}`);
    return fetch(`${API_URL}${path}`, { headers, credentials: "include" });
  };

  let res = await doFetch(authToken);
  if (res.status === 401 && authToken) {
    const newToken = await refreshAccessToken();
    if (newToken) res = await doFetch(newToken);
  }
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return res.blob();
}

/** Download a binary/text file from the API (e.g. CSV export). */
export async function apiDownload(path: string, filename: string, token?: string): Promise<void> {
  const blob = await authedBlob(path, token);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fetch an authenticated binary resource (e.g. inbox media) as an object URL. */
export async function apiObjectUrl(path: string, token?: string): Promise<string> {
  const blob = await authedBlob(path, token);
  return URL.createObjectURL(blob);
}
