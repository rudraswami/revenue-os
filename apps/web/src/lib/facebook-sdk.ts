declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        autoLogAppEvents?: boolean;
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
          response_type: string;
          override_default_response_type: boolean;
          auth_type?: string;
          extras?: Record<string, unknown>;
        },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const LOGIN_TIMEOUT_MS = 180_000;
const DEFAULT_GRAPH_VERSION = "v22.0";

export interface EmbeddedSignupCredentials {
  code: string;
  phoneNumberId: string;
  wabaId: string;
  businessId?: string;
  finishEvent: string;
}

export interface EmbeddedSignupDiagnostics {
  origin: string;
  appId: string;
  configId: string;
  graphApiVersion: string;
  sdkReady: boolean;
  domainOk: boolean;
}

function normalizeGraphVersion(version: string): string {
  const trimmed = version.trim().replace(/\\r\\n$|\\n$|\\r$/, "");
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function cleanMetaId(value: string): string {
  return value.trim().replace(/\\r\\n$|\\n$|\\r$/, "");
}

function loadFacebookSdkScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Facebook SDK requires a browser"));
  }

  if (window.FB) {
    return Promise.resolve();
  }

  const existing = document.getElementById("facebook-jssdk");
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.FB) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Facebook SDK failed to load")));
    });
  }

  return new Promise((resolve, reject) => {
    window.fbAsyncInit = () => resolve();

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

/** Chatwoot pattern: init after script load; re-init if appId changes. */
export async function initializeFacebook(appId: string, graphApiVersion: string): Promise<void> {
  const id = cleanMetaId(appId ?? "");
  if (!id) {
    throw new Error("Missing Meta App ID — set META_APP_ID on the API.");
  }

  await loadFacebookSdkScript();

  const version = normalizeGraphVersion(graphApiVersion || DEFAULT_GRAPH_VERSION);

  return new Promise((resolve) => {
    const init = () => {
      window.FB?.init({
        appId: id,
        autoLogAppEvents: true,
        xfbml: true,
        version,
      });
      resolve();
    };

    if (window.FB) {
      init();
    } else {
      window.fbAsyncInit = init;
    }
  });
}

function isFacebookOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host.endsWith("facebook.com") || host.endsWith("meta.com");
  } catch {
    return false;
  }
}

/** Chatwoot: business_id + waba_id required; phone_number_id may arrive empty on some flows. */
function isValidBusinessData(data?: {
  business_id?: string;
  waba_id?: string;
  phone_number_id?: string;
}): boolean {
  return !!(data?.business_id && data?.waba_id);
}

function buildExtras(featureType?: string, solutionId?: string): Record<string, unknown> {
  const setup: Record<string, unknown> = {};
  if (solutionId?.trim()) {
    setup.solutionID = solutionId.trim();
  }

  // Meta Embedded Signup v4: extras is { setup: {} } — config_id drives the flow.
  // sessionInfoVersion: "3" ensures reliable WA_EMBEDDED_SIGNUP postMessage events
  // (required for CoEx; safe/recommended for Cloud API too).
  const extras: Record<string, unknown> = {
    setup,
    sessionInfoVersion: "3",
  };

  const feature = featureType?.trim();
  if (feature) {
    extras.featureType = feature;
  }

  return extras;
}

function formatFbLoginError(response: {
  status?: string;
  error?: string;
  errorMessage?: string;
}): string {
  const detail = response.errorMessage ?? response.error ?? "";
  const lower = detail.toLowerCase();

  if (lower.includes("feature unavailable") || lower.includes("currently unavailable")) {
    return (
      "Meta blocked Facebook Login for this app (Feature Unavailable). " +
      "This is a Meta dashboard issue — not App Review and not a Growvisi bug. " +
      "Fix: add your Facebook account under App roles, complete Required actions / Data Use Checkup, " +
      "and set Facebook Login for Business → Allowed Domains to growvisi.in + www.growvisi.in. " +
      "See docs/META-FACEBOOK-GROWVISI.md."
    );
  }

  if (detail) return detail;

  if (response.status === "unknown") {
    return (
      "Facebook JSSDK error. Confirm Meta → Facebook Login for Business → Allowed Domains includes " +
      `“${typeof window !== "undefined" ? window.location.hostname : "your domain"}”.`
    );
  }

  return "Facebook login was not completed.";
}

export function getEmbeddedSignupDiagnostics(
  appId: string,
  configId: string,
  graphApiVersion: string,
): EmbeddedSignupDiagnostics {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const allowedHosts = new Set([
    "growvisi.in",
    "www.growvisi.in",
    "growvisi.com",
    "www.growvisi.com",
    "localhost",
    "127.0.0.1",
  ]);

  return {
    origin,
    appId: appId.trim(),
    configId: configId.trim(),
    graphApiVersion: normalizeGraphVersion(graphApiVersion || DEFAULT_GRAPH_VERSION),
    sdkReady: !!window.FB,
    domainOk: allowedHosts.has(hostname),
  };
}

export function getEmbeddedSignupLoginPayload(
  appId: string,
  configId: string,
  graphApiVersion: string,
  options?: { featureType?: string; solutionId?: string },
) {
  const cfg = cleanMetaId(configId ?? "");
  const app = cleanMetaId(appId ?? "");
  return {
    appId: app,
    configId: cfg,
    graphApiVersion: normalizeGraphVersion(graphApiVersion || DEFAULT_GRAPH_VERSION),
    loginOptions: {
      config_id: cfg,
      response_type: "code",
      override_default_response_type: true,
      extras: buildExtras(options?.featureType, options?.solutionId),
    },
  };
}

/**
 * Meta WhatsApp Embedded Signup — matches Chatwoot `useWhatsappEmbeddedSignup`.
 * Auth code and WABA payload arrive separately; resolve when both are present.
 *
 * Important race: when the Meta popup closes (Complete / Add payment), FB.login
 * often fires with empty authResponse a few ms BEFORE the WA_EMBEDDED_SIGNUP
 * FINISH postMessage. Treating empty authResponse as cancel immediately drops
 * the listener and Growvisi never saves the number.
 */
export function runEmbeddedSignup(
  appId: string,
  configId: string,
  graphApiVersion: string,
  options?: { featureType?: string; solutionId?: string },
): Promise<EmbeddedSignupCredentials | null> {
  const cfg = cleanMetaId(configId ?? "");
  const app = cleanMetaId(appId ?? "");
  if (!cfg) {
    return Promise.reject(
      new Error("Missing META_EMBEDDED_SIGNUP_CONFIG_ID on the API."),
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
    let emptyAuthTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (loginTimer) clearTimeout(loginTimer);
      if (emptyAuthTimer) clearTimeout(emptyAuthTimer);
      window.removeEventListener("message", onMessage);
    };

    const settleResolve = (value: EmbeddedSignupCredentials | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const settleReject = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const timeoutMessage = () => {
      if (authCode && !businessPayload) {
        return (
          "Facebook login succeeded but WhatsApp setup did not finish. " +
          "On the last Meta screen click Complete (not Add payment). Payment can be added later in WhatsApp Manager."
        );
      }
      if (!authCode && businessPayload) {
        return (
          "Meta returned WhatsApp account details but not an authorization code. " +
          "Click Complete quickly on the last screen — the auth code expires in ~30 seconds. Try again."
        );
      }
      return (
        "Facebook login timed out. Keep the Meta popup open through phone verification, " +
        "then click Complete (payment is optional and can be done later)."
      );
    };

    const resolveIfReady = () => {
      if (!authCode || !businessPayload) return;
      if (emptyAuthTimer) {
        clearTimeout(emptyAuthTimer);
        emptyAuthTimer = null;
      }
      if (!businessPayload.phone_number_id) {
        settleReject(
          new Error("Meta did not return a phone number. Add your WhatsApp number in the popup."),
        );
        return;
      }
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
          error_message?: string;
          current_step?: string;
        };
      };

      try {
        if (typeof event.data === "string") {
          payload = JSON.parse(event.data);
        } else if (typeof event.data === "object" && event.data !== null) {
          payload = event.data;
        } else {
          return;
        }
      } catch {
        return;
      }

      if (payload.type !== "WA_EMBEDDED_SIGNUP") return;

      if (
        payload.event === "FINISH" ||
        payload.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" ||
        payload.event === "FINISH_ONLY_WABA"
      ) {
        if (!isValidBusinessData(payload.data)) {
          settleReject(
            new Error("Meta did not return business account details. Finish all steps in the popup."),
          );
          return;
        }
        businessPayload = {
          phone_number_id: payload.data?.phone_number_id ?? "",
          waba_id: payload.data!.waba_id!,
          business_id: payload.data?.business_id,
          finishEvent: payload.event,
        };
        resolveIfReady();
        return;
      }

      if (payload.event === "CANCEL") {
        const step = payload.data?.current_step?.trim();
        const err = payload.data?.error_message?.trim();
        if (err) {
          settleReject(new Error(err));
          return;
        }
        // Payment / intermediate screens sometimes emit CANCEL with a step — don't drop
        // a successful finish that may still be in flight.
        if (step && /PAYMENT|BILLING/i.test(step) && (authCode || businessPayload)) {
          return;
        }
        if (authCode || businessPayload) {
          settleReject(
            new Error(
              step
                ? `Meta setup was cancelled at step “${step}”. On the last screen click Complete.`
                : "Meta setup was cancelled before finishing. On the last screen click Complete (not Add payment).",
            ),
          );
          return;
        }
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
        await initializeFacebook(app, graphApiVersion);

        if (!window.FB) {
          throw new Error("Facebook SDK not ready after init");
        }

        loginTimer = setTimeout(() => {
          settleReject(new Error(timeoutMessage()));
        }, LOGIN_TIMEOUT_MS);

        // Meta v4 Embedded Signup: config_id drives permissions — keep options minimal.
        window.FB.login(
          (response) => {
            const code = response.authResponse?.code;
            if (code) {
              authCode = code;
              resolveIfReady();
              return;
            }

            if (response.error) {
              settleReject(new Error(response.error));
              return;
            }

            if (!response.authResponse) {
              // Grace period: popup close often races ahead of FINISH postMessage.
              if (emptyAuthTimer) clearTimeout(emptyAuthTimer);
              emptyAuthTimer = setTimeout(() => {
                if (settled) return;
                if (authCode && businessPayload) {
                  resolveIfReady();
                  return;
                }
                if (businessPayload && !authCode) {
                  settleReject(
                    new Error(
                      "Meta finished WhatsApp setup but the login code was missing. " +
                        "Click Complete (not Add payment) and try again immediately.",
                    ),
                  );
                  return;
                }
                if (authCode && !businessPayload) {
                  settleReject(
                    new Error(
                      "Meta closed before sending WhatsApp account details. " +
                        "Click Complete on the last screen — skip Add payment for now.",
                    ),
                  );
                  return;
                }
                settleResolve(null);
              }, 2500);
              return;
            }

            settleReject(new Error(formatFbLoginError(response)));
          },
          {
            config_id: cfg,
            response_type: "code",
            override_default_response_type: true,
            extras: buildExtras(options?.featureType, options?.solutionId),
          },
        );
      } catch (error) {
        settleReject(error instanceof Error ? error : new Error("Facebook setup failed"));
      }
    })();
  });
}
