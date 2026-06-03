/** Strip CRLF and whitespace accidentally added via Windows shells / Vercel CLI. */
export function sanitizeEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Production Vercel aliases for revenue-os-web (preview + production). */
const REVENUE_OS_WEB_VERCEL =
  /^https:\/\/revenue-os-web[\w.-]*\.vercel\.app$/;

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (getAllowedOrigins().includes(origin)) {
    return true;
  }
  return REVENUE_OS_WEB_VERCEL.test(origin);
}

export function getAllowedOrigins(): string[] {
  const extra =
    process.env.CORS_ORIGINS?.split(",").map((o) => sanitizeEnvValue(o)).filter(Boolean) ?? [];
  const fromEnv = [
    sanitizeEnvValue(process.env.NEXT_PUBLIC_APP_URL),
    ...extra,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean) as string[];

  return [...new Set(fromEnv)];
}
