/**
 * `fetch()` never times out on its own — a slow/unreachable upstream (Meta Graph API,
 * OpenAI, Razorpay, a customer's webhook endpoint) can hang a request indefinitely,
 * which surfaces to users as an endless loading spinner that never resolves.
 *
 * Wrap every outbound HTTP call with this so a stuck upstream fails fast instead of
 * blocking the whole request (and, on serverless, burning the function's execution time).
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: init.signal ?? controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request to ${String(input)} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface RetryOptions {
  /** Total attempts including the first (default 3). */
  attempts?: number;
  /** Base backoff in ms; doubled each retry with jitter (default 500). */
  baseDelayMs?: number;
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `fetchWithTimeout` plus bounded exponential-backoff retries for transient
 * upstream failures (network errors, HTTP 429, and 5xx). Only use this for
 * IDEMPOTENT calls (e.g. OpenAI embeddings/classification) — never for
 * non-idempotent side effects like sending a WhatsApp message.
 *
 * Returns the last response even if non-2xx (after exhausting retries) so callers
 * keep their existing status handling.
 */
export async function fetchWithRetry(
  input: string | URL,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 500;
  const timeoutMs = options.timeoutMs ?? 15_000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);
      if (res.status !== 429 && res.status < 500) {
        return res;
      }
      if (attempt === attempts) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      if (attempt === attempts) throw err;
    }

    const backoff = baseDelayMs * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * baseDelayMs);
    await sleep(backoff + jitter);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Request to ${String(input)} failed after ${attempts} attempts`);
}
