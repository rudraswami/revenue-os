import type { LogoutReason, RefreshResult } from "@/lib/auth-session-death";

type RefreshLog = {
  event: "auth.refresh";
  reason: string;
  result: RefreshResult["kind"];
  latencyMs: number;
  retryCount: number;
  status?: number;
  message?: string;
  at: string;
};

type LogoutLog = {
  event: "auth.logout";
  reason: LogoutReason;
  at: string;
};

function emit(payload: RefreshLog | LogoutLog) {
  // Structured logs for production debugging — never include tokens.
  if (typeof console !== "undefined") {
    console.info(JSON.stringify(payload));
  }
}

export function logRefreshAttempt(input: {
  reason: string;
  result: RefreshResult;
}): void {
  emit({
    event: "auth.refresh",
    reason: input.reason,
    result: input.result.kind,
    latencyMs: input.result.latencyMs,
    retryCount: input.result.retryCount,
    status: input.result.kind === "SUCCESS" ? 200 : input.result.status,
    message: input.result.kind === "SUCCESS" ? undefined : input.result.message,
    at: new Date().toISOString(),
  });
}

export function logLogout(reason: LogoutReason): void {
  emit({
    event: "auth.logout",
    reason,
    at: new Date().toISOString(),
  });
}
