/**
 * Bounds a promise that could otherwise hang forever — e.g. a BullMQ `queue.add()`
 * call when Redis is unreachable. ioredis buffers commands and waits indefinitely
 * for a connection by default, which blocks the whole HTTP request.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
