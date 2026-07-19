import type { LogoutReason } from "@/lib/auth-session-death";

/** URL query value for /login?reason= */
export type LoginReasonParam = "session_expired" | "session_ended" | "signed_out";

export function logoutReasonToLoginParam(reason: LogoutReason | null): LoginReasonParam | null {
  if (!reason) return null;
  switch (reason) {
    case "REFRESH_TOKEN_EXPIRED":
    case "TOKEN_INVALID":
    case "BOOTSTRAP_AUTH_INVALID":
      return "session_expired";
    case "TOKEN_REVOKED":
    case "PASSWORD_CHANGED":
    case "ACCOUNT_DISABLED":
      return "session_ended";
    case "USER_SIGN_OUT":
      return "signed_out";
    default:
      return "session_expired";
  }
}

export function loginRedirectPath(reason: LogoutReason | null): string {
  const param = logoutReasonToLoginParam(reason);
  return param ? `/login?reason=${param}` : "/login";
}

export function loginReasonMessage(param: string | null | undefined): string | null {
  switch (param) {
    case "session_expired":
      return "Your session expired. Please sign in again.";
    case "session_ended":
      return "Your session was ended on another device. Please sign in again.";
    case "signed_out":
      return "You signed out in another tab.";
    default:
      return null;
  }
}
