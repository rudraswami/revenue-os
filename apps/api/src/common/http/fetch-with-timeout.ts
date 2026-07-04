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
