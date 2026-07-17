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

/** Shown when fetch fails (offline, DNS, CORS) — never expose internal URLs to customers. */
export const CUSTOMER_NETWORK_ERROR =
  "We couldn't reach Growvisi. Check your internet connection and try again, or email support@growvisi.in.";

/** Shown when a request hangs — never spin forever on a slow/stuck backend. */
export const CUSTOMER_TIMEOUT_ERROR =
  "That took too long to respond. Please try again in a moment.";

/** Bound every request so a stuck backend call can't spin the UI forever. */
const REQUEST_TIMEOUT_MS = 20_000;

function logNetworkFailure(path: string, cause: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[growvisi-api] Network error on ${path}`, cause);
    console.info(`[growvisi-api] Base URL: ${API_URL}`);
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public meta?: {
      reason?: string;
      limit?: number | null;
      used?: number | null;
      planId?: string;
      suggestedPlan?: string;
    },
  ) {
    super(message);
  }
}

const INTERNAL_ERROR_PATTERN =
  /requiresHuman|prisma|ECONNREFUSED|localhost|127\.0\.0\.1|pnpm dev|Graph API|OPENAI|nestjs|META_APP_ID|WHATSAPP_VERIFY/i;

const FRICTION_CODES = new Set([
  "TEAM_SEAT_LIMIT",
  "WHATSAPP_NUMBER_LIMIT",
  "LEAD_MONTHLY_LIMIT",
  "AGENCY_CLIENT_LIMIT",
  "PLAN_FEATURE_REQUIRED",
  "TRIAL_EXPIRED",
  "SUBSCRIPTION_INACTIVE",
]);

/** Map API errors to customer-safe copy. Logs raw message in development. */
export function toUserMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(error instanceof ApiError)) return fallback;

  if (process.env.NODE_ENV === "development") {
    console.warn("[growvisi-api] Error surfaced to user:", error.status, error.message);
  }

  if (error.status === 0) return error.message;
  if (error.status === 401) return "Your session expired. Please sign in again.";
  if (error.status === 402) {
    return error.message || "Your trial has ended. Open Plans & pricing to upgrade and continue.";
  }
  if (error.status === 403) {
    if (error.code && FRICTION_CODES.has(error.code)) {
      return error.message;
    }
    if (/plan|growth|pro|subscription|trial|upgrade|limit|seat|whatsapp|lead/i.test(error.message)) {
      return error.message || "This feature needs a higher plan. View Plans & pricing in the sidebar.";
    }
    return "You don't have permission to do that.";
  }
  if (error.status === 404) return "We couldn't find that. It may have been removed.";
  if (error.status === 429) return "Too many requests. Please wait a moment and try again.";
  if (error.status === 503) {
    return "Could not reach an upstream service. Please try again in a moment.";
  }
  if (error.status >= 500) {
    return "Something went wrong on our side. Please try again or email support@growvisi.in.";
  }

  const msg = error.message.trim();
  if (!msg || INTERNAL_ERROR_PATTERN.test(msg)) return fallback;
  return msg;
}

export function isUpgradeFrictionError(error: unknown): error is ApiError {
  return error instanceof ApiError && !!error.code && FRICTION_CODES.has(error.code);
}

let refreshInFlight: Promise<string | null> | null = null;

async function parseError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    code?: string;
    reason?: string;
    limit?: number | null;
    used?: number | null;
    planId?: string;
    suggestedPlan?: string;
  };
  const msg = Array.isArray(body.message)
    ? body.message.join(", ")
    : (body.message ?? res.statusText);
  return new ApiError(msg, res.status, body.code, {
    reason: body.reason,
    limit: body.limit,
    used: body.used,
    planId: body.planId,
    suggestedPlan: body.suggestedPlan,
  });
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
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    logNetworkFailure(path, cause);
    if (cause instanceof DOMException && cause.name === "TimeoutError") {
      throw new ApiError(CUSTOMER_TIMEOUT_ERROR, 0);
    }
    throw new ApiError(CUSTOMER_NETWORK_ERROR, 0);
  }

  if (!res.ok) {
    throw await parseError(res);
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
    throw await parseError(res);
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
