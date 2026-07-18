/** Core fetch + ApiError — no auth refresh (avoids circular imports). */

function resolveApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000")
    .replace(/\\r\\n/g, "")
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/\/$/, "");
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
}

export const API_URL = resolveApiBase();

export const CUSTOMER_NETWORK_ERROR =
  "We couldn't reach Growvisi. Check your internet connection and try again, or email it@growvisi.com.";

export const CUSTOMER_TIMEOUT_ERROR =
  "That took too long to respond. Please try again in a moment.";

export const CUSTOMER_SERVICE_ERROR =
  "Growvisi is temporarily unavailable. Please try again in a moment — you are still signed in.";

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

/** Low-level fetch used by auth refresh and apiFetch. */
export async function rawFetchForAuth<T>(path: string, options: RequestInit = {}): Promise<T> {
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
