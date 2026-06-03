export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface OnboardingStatus {
  whatsappConnected: boolean;
  firstMessageReceived: boolean;
  complete: boolean;
}

export interface AuthSession {
  user: AuthUser;
  organization: AuthOrganization;
  accessToken: string;
  refreshToken: string;
  onboarding: OnboardingStatus;
}

export interface MeResponse {
  user: AuthUser;
  organization: AuthOrganization;
  role: string;
  onboarding: OnboardingStatus;
}

export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
}

export type LoginResult =
  | AuthSession
  | { needsOrganizationSelection: true; organizations: OrganizationOption[] };

export function isAuthSession(result: LoginResult): result is AuthSession {
  return "accessToken" in result;
}
