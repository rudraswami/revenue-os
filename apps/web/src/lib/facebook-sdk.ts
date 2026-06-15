declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        autoLogAppEvents?: boolean;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string; accessToken?: string };
          status?: string;
          error?: string;
          errorMessage?: string;
        }) => void,
        options: {
          config_id: string;
          auth_type?: string;
          response_type: string;
          override_default_response_type: boolean;
          extras?: Record<string, unknown>;
        },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

let sdkPromise: Promise<void> | null = null;
let initializedAppId: string | null = null;

const LOGIN_TIMEOUT_MS = 180_000;

export interface EmbeddedSignupCredentials {
  code: string;
  phoneNumberId: string;
  wabaId: string;
  businessId?: string;
  finishEvent: string;
}

function normalizeGraphVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function initFacebookSdk(appId: string, graphApiVersion: string): void {
  window.FB?.init({
    appId,
    autoLogAppEvents: true,
    cookie: true,
    xfbml: true,
    version: normalizeGraphVersion(graphApiVersion || "v21.0"),
  });
  initializedAppId = appId;
}

export function loadFacebookSdk(appId: string, graphApiVersion: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK requires a browser"));
  }

  const id = appId?.trim();
  if (!id) {
    return Promise.reject(
      new Error(
        "WhatsApp connection is not configured (missing Meta App ID). Set META_APP_ID on the API.",
      ),
    );
  }

  if (window.FB && initializedAppId === id) {
    return Promise.resolve();
  }

  const version = normalizeGraphVersion(graphApiVersion || "v21.0");

  if (!sdkPromise || initializedAppId !== id) {
    sdkPromise = new Promise((resolve, reject) => {
      window.fbAsyncInit = () => {
        try {
          initFacebookSdk(id, version);
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Facebook SDK init failed"));
        }
      };

      const existing = document.getElementById("facebook-jssdk");
      if (existing) {
        if (window.FB) {
          initFacebookSdk(id, version);
          resolve();
          return;
        }
        existing.addEventListener("load", () => {
          initFacebookSdk(id, version);
          resolve();
        });
        existing.addEventListener("error", () => reject(new Error("Facebook SDK failed to load")));
        return;
      }

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.onerror = () => reject(new Error("Facebook SDK failed to load"));
      document.body.appendChild(script);
    });
  }

  return sdkPromise;
}

function isFacebookOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

function buildEmbeddedSignupExtras(solutionId?: string): Record<string, unknown> {
  const setup: Record<string, unknown> = {};
  if (solutionId?.trim()) {
    setup.solutionID = solutionId.trim();
  }

  return {
    setup,
    featureType: "whatsapp_business_app_onboarding",
    sessionInfoVersion: "3",
  };
}

function formatFbLoginError(response: {
  status?: string;
  error?: string;
  errorMessage?: string;
}): string {
  const detail = response.errorMessage ?? response.error;
  if (detail) return detail;

  if (response.status === "unknown") {
    return (
      "Facebook could not open WhatsApp setup (JSSDK error). " +
      "Use your live app URL (e.g. https://www.growvisi.com), allow popups, and add that domain under Meta → Facebook Login for Business → Allowed Domains with Login with JavaScript SDK enabled."
    );
  }

  if (response.status === "not_authorized") {
    return "Facebook login was not completed. Finish every step in the Meta popup.";
  }

  return (
    "Could not authorize with Facebook. If the popup says Feature Unavailable, your Meta app may be in Development mode — add this Facebook user under App roles → Roles, or switch the app to Live."
  );
}

function isValidBusinessPayload(data?: {
  business_id?: string;
  waba_id?: string;
  phone_number_id?: string;
}): boolean {
  return !!(data?.business_id && data?.waba_id && data?.phone_number_id);
}

/**
 * Meta WhatsApp Embedded Signup — official JS SDK flow (Chatwoot / Twilio pattern).
 *
 * Do NOT use facebook.com/dialog/oauth manually. Embedded Signup requires FB.login()
 * from the JS SDK on an allowed domain. The auth code and WABA ids arrive separately;
 * we resolve once both are present.
 */
export function runEmbeddedSignup(
  appId: string,
  configId: string,
  graphApiVersion: string,
  solutionId?: string,
): Promise<EmbeddedSignupCredentials | null> {
  const cfg = configId?.trim();
  if (!cfg) {
    return Promise.reject(
      new Error(
        "Missing Embedded Signup configuration ID. Set META_EMBEDDED_SIGNUP_CONFIG_ID on the API.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    let authCode: string | null = null;
    let businessPayload: {
      phone_number_id: string;
      waba_id: string;
      business_id?: string;
      finishEvent: string;
    } | null = null;
    let settled = false;
    let loginTimer: ReturnType<typeof setTimeout> | null = null;

    const settleResolve = (value: EmbeddedSignupCredentials | null) => {
      if (settled) return;
      settled = true;
      if (loginTimer) clearTimeout(loginTimer);
      window.removeEventListener("message", onMessage);
      resolve(value);
    };

    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      if (loginTimer) clearTimeout(loginTimer);
      window.removeEventListener("message", onMessage);
      reject(error);
    };

    const resolveIfReady = () => {
      if (!authCode || !businessPayload) return;
      settleResolve({
        code: authCode,
        phoneNumberId: businessPayload.phone_number_id,
        wabaId: businessPayload.waba_id,
        businessId: businessPayload.business_id,
        finishEvent: businessPayload.finishEvent,
      });
    };

    const onMessage = (event: MessageEvent) => {
      if (!isFacebookOrigin(event.origin)) return;

      let payload: {
        type?: string;
        event?: string;
        data?: {
          phone_number_id?: string;
          waba_id?: string;
          business_id?: string;
          current_step?: string;
          error_message?: string;
        };
      };

      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (payload.type !== "WA_EMBEDDED_SIGNUP") return;

      if (
        payload.event === "FINISH" ||
        payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ||
        payload.event === "FINISH_OBO_MIGRATION" ||
        payload.event === "FINISH_GRANT_ONLY_API_ACCESS"
      ) {
        if (!isValidBusinessPayload(payload.data)) {
          settleReject(
            new Error("Meta did not return your WhatsApp business details. Finish all steps in the popup."),
          );
          return;
        }
        businessPayload = {
          phone_number_id: payload.data!.phone_number_id!,
          waba_id: payload.data!.waba_id!,
          business_id: payload.data!.business_id,
          finishEvent: payload.event!,
        };
        resolveIfReady();
        return;
      }

      if (payload.event === "FINISH_ONLY_WABA") {
        settleReject(new Error("Please add your business phone number before finishing setup."));
        return;
      }

      if (payload.event === "CANCEL") {
        settleResolve(null);
        return;
      }

      if (payload.event === "ERROR") {
        settleReject(
          new Error(payload.data?.error_message ?? "Facebook could not complete WhatsApp setup."),
        );
      }
    };

    window.addEventListener("message", onMessage);

    void (async () => {
      try {
        await loadFacebookSdk(appId, graphApiVersion);

        if (!window.FB) {
          throw new Error("Facebook SDK not ready");
        }

        loginTimer = setTimeout(() => {
          settleReject(
            new Error(
              "Facebook login timed out. Allow popups and complete every step—including picking your WhatsApp number.",
            ),
          );
        }, LOGIN_TIMEOUT_MS);

        window.FB.login(
          (response) => {
            const code = response.authResponse?.code;
            if (code) {
              authCode = code;
              resolveIfReady();
              return;
            }

            if (response.status === "not_authorized" || !response.authResponse) {
              settleResolve(null);
              return;
            }

            settleReject(new Error(formatFbLoginError(response)));
          },
          {
            config_id: cfg,
            auth_type: "rerequest",
            response_type: "code",
            override_default_response_type: true,
            extras: buildEmbeddedSignupExtras(solutionId),
          },
        );
      } catch (error) {
        settleReject(error instanceof Error ? error : new Error("Facebook setup failed"));
      }
    })();
  });
}

/** @deprecated Use runEmbeddedSignup — kept for any stale imports */
export function listenEmbeddedSignup(
  onSession: (session: { phoneNumberId: string; wabaId: string; finishEvent: string }) => void,
  onCancel: (message: string) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    if (!isFacebookOrigin(event.origin)) return;
    try {
      const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (payload?.type !== "WA_EMBEDDED_SIGNUP") return;
      if (payload.event === "FINISH" && payload.data?.phone_number_id && payload.data?.waba_id) {
        onSession({
          phoneNumberId: payload.data.phone_number_id,
          wabaId: payload.data.waba_id,
          finishEvent: payload.event,
        });
      } else if (payload.event === "CANCEL" || payload.event === "ERROR") {
        onCancel(payload.data?.error_message ?? "Setup cancelled");
      }
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/** @deprecated Use runEmbeddedSignup */
export const launchEmbeddedSignup = runEmbeddedSignup;
