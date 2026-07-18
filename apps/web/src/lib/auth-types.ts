import type { MembershipRole } from "@growvisi/shared";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  locale?: string;
  emailVerified?: string | null;
}

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string;
  kind?: string;
}

export interface OnboardingStatus {
  whatsappConnected: boolean;
  firstMessageReceived: boolean;
  complete: boolean;
}

export interface AuthSession {
  user: AuthUser;
  organization: AuthOrganization;
  role: MembershipRole;
  accessToken: string;
  refreshToken: string;
  onboarding: OnboardingStatus;
}

export interface MeResponse {
  user: AuthUser;
  organization: AuthOrganization;
  role: MembershipRole;
  onboarding: OnboardingStatus;
  workspaces?: WorkspaceOption[];
}

export interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
  kind?: string;
  role: MembershipRole;
  isCurrent: boolean;
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
