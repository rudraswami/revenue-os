import type { SubscriptionAccess, SubscriptionAccessInput } from "@growvisi/shared";
import { resolveSubscriptionAccess } from "@growvisi/shared";

/** Raw subscription fields cached in Redis — access is re-resolved on every read (trial expiry stays correct). */
export type CachedEntitlementsInput = {
  planId: string;
  status: string;
  createdAt: string;
  currentPeriodEnd: string | null;
};

export function toCachedEntitlementsInput(input: SubscriptionAccessInput): CachedEntitlementsInput {
  return {
    planId: input.planId,
    status: input.status,
    createdAt: input.createdAt.toISOString(),
    currentPeriodEnd: input.currentPeriodEnd ? input.currentPeriodEnd.toISOString() : null,
  };
}

export function resolveCachedEntitlements(cached: CachedEntitlementsInput): SubscriptionAccess {
  return resolveSubscriptionAccess({
    planId: cached.planId,
    status: cached.status,
    createdAt: new Date(cached.createdAt),
    currentPeriodEnd: cached.currentPeriodEnd ? new Date(cached.currentPeriodEnd) : null,
  });
}

export function isCachedEntitlementsInput(value: unknown): value is CachedEntitlementsInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.planId === "string" &&
    typeof v.status === "string" &&
    typeof v.createdAt === "string" &&
    (v.currentPeriodEnd === null || typeof v.currentPeriodEnd === "string")
  );
}
