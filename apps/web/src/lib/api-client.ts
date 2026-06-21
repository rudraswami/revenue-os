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
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
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
  if (!refreshToken) {
    clear();
    return null;
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const session = await rawFetch<AuthSession>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
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

function resolveApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000")
    .replace(/\\r\\n/g, "")
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/\/$/, "");
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
}

/** Download a binary/text file from the API (e.g. CSV export). */
export async function apiDownload(path: string, filename: string, token?: string): Promise<void> {
  const authToken = token ?? useAuthStore.getState().accessToken ?? undefined;
  const headers = new Headers();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${resolveApiBase()}${path}`, { headers });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
