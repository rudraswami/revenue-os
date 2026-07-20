import type { QueryClient } from "@tanstack/react-query";

let queryClient: QueryClient | null = null;

/** Registered once from Providers — enables auth/session cache hygiene without circular imports. */
export function setQueryClientRef(client: QueryClient): void {
  queryClient = client;
}

export function getQueryClientRef(): QueryClient | null {
  return queryClient;
}
