/** Server-side Redis cache keys — see docs/architecture/04-performance-engineering-standards.md §4.2 */

export const SERVER_CACHE_TTL = {
  entitlementsSec: 60,
  membershipSec: 60,
  shellBootstrapSec: 30,
  shellBootstrapVersionSec: 3600,
  queueStatsSec: 15,
  onboardingSec: 60,
} as const;

const PREFIX = "gv";

export function entitlementsCacheKey(organizationId: string): string {
  return `${PREFIX}:entitlements:${organizationId}`;
}

export function membershipCacheKey(userId: string, organizationId: string): string {
  return `${PREFIX}:membership:${userId}:${organizationId}`;
}

export function shellBootstrapVersionKey(organizationId: string): string {
  return `${PREFIX}:shell-bootstrap-ver:${organizationId}`;
}

export function shellBootstrapCacheKey(organizationId: string, userId: string): string {
  return `${PREFIX}:shell-bootstrap:${organizationId}:${userId}`;
}

export function queueStatsCacheKey(organizationId: string, userId: string): string {
  return `${PREFIX}:queue-stats:${organizationId}:${userId}`;
}

export function onboardingCacheKey(organizationId: string): string {
  return `${PREFIX}:onboarding:${organizationId}`;
}
