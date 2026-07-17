/**
 * Session death classification — only conclusive auth failures may end a session.
 * Transient infrastructure/network errors must never clear auth state.
 */

export type RefreshResultKind =
  | "SUCCESS"
  | "NETWORK_FAILURE"
  | "SERVER_FAILURE"
  | "AUTH_EXPIRED"
  | "AUTH_REVOKED"
  | "AUTH_INVALID";

export type LogoutReason =
  | "USER_SIGN_OUT"
  | "REFRESH_TOKEN_EXPIRED"
  | "TOKEN_REVOKED"
  | "TOKEN_INVALID"
  | "PASSWORD_CHANGED"
  | "ACCOUNT_DISABLED"
  | "BOOTSTRAP_AUTH_INVALID";

export type RefreshSuccess = {
  kind: "SUCCESS";
  accessToken: string;
  latencyMs: number;
  retryCount: number;
};

export type RefreshFailure = {
  kind: Exclude<RefreshResultKind, "SUCCESS">;
  message: string;
  status?: number;
  latencyMs: number;
  retryCount: number;
};

export type RefreshResult = RefreshSuccess | RefreshFailure;

/** True only when the backend has confirmed the session cannot continue. */
export function isConclusiveAuthDeath(kind: RefreshResultKind): boolean {
  return kind === "AUTH_EXPIRED" || kind === "AUTH_REVOKED" || kind === "AUTH_INVALID";
}

export function logoutReasonFromRefresh(kind: RefreshFailure["kind"]): LogoutReason {
  switch (kind) {
    case "AUTH_EXPIRED":
      return "REFRESH_TOKEN_EXPIRED";
    case "AUTH_REVOKED":
      return "TOKEN_REVOKED";
    case "AUTH_INVALID":
      return "TOKEN_INVALID";
    default:
      return "TOKEN_INVALID";
  }
}

/**
 * Map HTTP/network errors from POST /auth/refresh into a classified result.
 * 401/403 from refresh = conclusive auth death. 0 = network. 5xx/429 = server.
 */
export function classifyRefreshFailure(
  status: number,
  message: string,
  latencyMs: number,
  retryCount: number,
): RefreshFailure {
  const msg = message || "Refresh failed";
  const base = { message: msg, status, latencyMs, retryCount };

  if (status === 0) {
    return { kind: "NETWORK_FAILURE", ...base };
  }
  if (status >= 500 || status === 429) {
    return { kind: "SERVER_FAILURE", ...base };
  }
  if (status === 401 || status === 403) {
    const lower = msg.toLowerCase();
    if (/revok/.test(lower)) {
      return { kind: "AUTH_REVOKED", ...base };
    }
    if (/expir|session expired|sign in again/.test(lower)) {
      return { kind: "AUTH_EXPIRED", ...base };
    }
    return { kind: "AUTH_INVALID", ...base };
  }
  // Unexpected 4xx on refresh — treat as invalid session only for 401-class;
  // other 4xx (400 body) still auth-invalid for refresh endpoint.
  if (status >= 400 && status < 500) {
    return { kind: "AUTH_INVALID", ...base };
  }
  return { kind: "SERVER_FAILURE", ...base };
}

export function customerMessageForRefresh(kind: RefreshResultKind): string {
  switch (kind) {
    case "SUCCESS":
      return "";
    case "NETWORK_FAILURE":
      return "We couldn't reach Growvisi. Check your connection — your session is still saved.";
    case "SERVER_FAILURE":
      return "Growvisi is temporarily unavailable. Please try again in a moment — you are still signed in.";
    case "AUTH_EXPIRED":
      return "Your session expired. Please sign in again.";
    case "AUTH_REVOKED":
      return "Your session was ended. Please sign in again.";
    case "AUTH_INVALID":
      return "Please sign in again to continue.";
  }
}
