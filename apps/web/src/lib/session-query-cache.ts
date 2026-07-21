import type { QueryClient } from "@tanstack/react-query";
import { getQueryClientRef } from "@/lib/query-client-ref";
import { QUERY_KEYS } from "@/lib/query-config";
import { removePersistedQueryCache } from "@/lib/query-persister";

/** Keys seeded by GET /organizations/shell-bootstrap — invalidate together on workspace changes. */
export const SHELL_WORKSPACE_QUERY_KEYS = [
  QUERY_KEYS.shellBootstrap,
  QUERY_KEYS.authMe,
  QUERY_KEYS.billing,
  QUERY_KEYS.whatsappAccounts,
  QUERY_KEYS.onboardingProgress,
  QUERY_KEYS.onboardingCoaching,
  QUERY_KEYS.conversationCapabilities,
  QUERY_KEYS.agencyStatus,
  QUERY_KEYS.whatsappConnectionHealth,
  QUERY_KEYS.paymentIntegration,
] as const;

function clientOrRef(qc?: QueryClient): QueryClient | null {
  return qc ?? getQueryClientRef();
}

/**
 * Logout / auth death — drop all cached API data so the next user cannot inherit state.
 */
export function clearSessionQueryCache(qc?: QueryClient): void {
  const client = clientOrRef(qc);
  if (!client) return;
  client.clear();
  // Also wipe the on-disk (IndexedDB) snapshot so a new user on this device
  // cannot hydrate the previous account's cached data on next load.
  void removePersistedQueryCache();
}

/**
 * New login, WA connect, billing change, etc. — force shell bootstrap + seeded caches to refresh.
 */
export function invalidateWorkspaceShellCache(qc?: QueryClient): void {
  const client = clientOrRef(qc);
  if (!client) return;
  for (const key of SHELL_WORKSPACE_QUERY_KEYS) {
    void client.invalidateQueries({ queryKey: key });
  }
}
