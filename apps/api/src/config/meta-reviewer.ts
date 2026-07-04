/** Meta App Review demo account — full product access, never subscription-gated. */
const DEFAULT_META_REVIEWER_EMAIL = "meta.reviewer@growvisi.in";

export function metaReviewerEmail(): string {
  return (process.env.META_REVIEWER_EMAIL ?? DEFAULT_META_REVIEWER_EMAIL).trim().toLowerCase();
}

export function isMetaReviewerEmail(email: string): boolean {
  return email.trim().toLowerCase() === metaReviewerEmail();
}
