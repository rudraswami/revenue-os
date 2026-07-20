import { apiObjectUrl } from "@/lib/api-client";

const cache = new Map<string, string>();

function cacheKey(conversationId: string, messageId: string): string {
  return `${conversationId}:${messageId}`;
}

/** Reuse blob URLs across thread remounts — avoids re-fetching media on conversation switch. */
export async function getCachedInboxMediaUrl(
  conversationId: string,
  messageId: string,
): Promise<string> {
  const key = cacheKey(conversationId, messageId);
  const hit = cache.get(key);
  if (hit) return hit;

  const url = await apiObjectUrl(`/conversations/${conversationId}/messages/${messageId}/media`);
  cache.set(key, url);
  return url;
}

export function releaseInboxMediaUrl(conversationId: string, messageId: string): void {
  const key = cacheKey(conversationId, messageId);
  const url = cache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    cache.delete(key);
  }
}

/** Test helper — clear module cache between tests. */
export function clearInboxMediaCacheForTests(): void {
  for (const url of cache.values()) {
    URL.revokeObjectURL(url);
  }
  cache.clear();
}
