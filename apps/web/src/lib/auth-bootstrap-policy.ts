/** Whether background session bootstrap should run after Zustand rehydration. */
export function shouldRunBootstrapOnHydrate(params: {
  refreshToken: string | null;
  accessToken: string | null;
  hasSessionHint: boolean;
}): boolean {
  return !!(params.refreshToken || params.accessToken || params.hasSessionHint);
}

/**
 * Dashboard shell can render while the access token is being restored from the
 * HttpOnly refresh cookie when we still have a persisted user profile.
 */
export function canRenderDashboardWhileRestoringSession(params: {
  accessToken: string | null;
  user: { id: string } | null;
  hasSessionHint: boolean;
  hasTransientFailure: boolean;
}): boolean {
  if (params.accessToken) return true;
  if (!params.hasSessionHint && !params.hasTransientFailure) return false;
  return !!params.user;
}
