/** Preserve auth-related query params across login ↔ register links. */
const PRESERVED_PARAMS = ["next", "invite", "email"] as const;

export function withAuthQuery(path: string, searchParams: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of PRESERVED_PARAMS) {
    const value = searchParams.get(key);
    if (value) q.set(key, value);
  }
  const query = q.toString();
  return query ? `${path}?${query}` : path;
}
