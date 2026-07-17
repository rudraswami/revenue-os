import {
  ApiError,
  API_URL,
  CUSTOMER_NETWORK_ERROR,
  CUSTOMER_SERVICE_ERROR,
  CUSTOMER_TIMEOUT_ERROR,
  rawFetchForAuth,
} from "@/lib/api-client-core";
import { refreshAccessToken, refreshSession } from "@/lib/auth-refresh";
import { useAuthStore } from "@/stores/auth-store";

export {
  ApiError,
  API_URL,
  CUSTOMER_NETWORK_ERROR,
  CUSTOMER_SERVICE_ERROR,
  CUSTOMER_TIMEOUT_ERROR,
};
export { refreshAccessToken, refreshSession } from "@/lib/auth-refresh";

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
  // Only use session-expired copy when the caller has already decided auth is dead.
  // Generic 401s often mean "retry refresh" — prefer neutral wording.
  if (error.status === 401) {
    return error.message?.trim() && !INTERNAL_ERROR_PATTERN.test(error.message)
      ? error.message
      : "Please sign in again to continue.";
  }
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
    return CUSTOMER_SERVICE_ERROR;
  }
  if (error.status >= 500) {
    return CUSTOMER_SERVICE_ERROR;
  }

  const msg = error.message.trim();
  if (!msg || INTERNAL_ERROR_PATTERN.test(msg)) return fallback;
  return msg;
}

export function isUpgradeFrictionError(error: unknown): error is ApiError {
  return error instanceof ApiError && !!error.code && FRICTION_CODES.has(error.code);
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
    return await rawFetchForAuth<T>(path, { ...init, headers });
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      token &&
      !skipAuthRetry &&
      !path.startsWith("/auth/")
    ) {
      const newToken = await refreshAccessToken("api_401");
      if (newToken) {
        const retryHeaders = new Headers(init.headers);
        retryHeaders.set("Content-Type", "application/json");
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return rawFetchForAuth<T>(path, { ...init, headers: retryHeaders });
      }
      // Transient refresh failure: rethrow original 401 without having cleared session
      const transient = useAuthStore.getState().lastTransientFailure;
      if (transient) {
        throw new ApiError(CUSTOMER_SERVICE_ERROR, 0);
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
    const newToken = await refreshAccessToken("api_blob_401");
    if (newToken) res = await doFetch(newToken);
  }
  if (!res.ok) {
    if (res.status >= 500) {
      throw new ApiError(CUSTOMER_SERVICE_ERROR, res.status);
    }
    if (res.status === 0) {
      throw new ApiError(CUSTOMER_NETWORK_ERROR, 0);
    }
    throw new ApiError(res.statusText || "Request failed", res.status);
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
