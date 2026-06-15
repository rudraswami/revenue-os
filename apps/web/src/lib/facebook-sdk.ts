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
          authResponse?: { code?: string };
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

function normalizeGraphVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

function initFacebookSdk(appId: string, graphApiVersion: string): void {
  const version = normalizeGraphVersion(graphApiVersion || "v21.0");
  window.FB?.init({
    appId,
    autoLogAppEvents: true,
    cookie: true,
    xfbml: true,
    version,
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
        "WhatsApp connection is not configured (missing Meta App ID). Contact support or check server env META_APP_ID.",
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

export interface EmbeddedSignupSession {
  phoneNumberId: string;
  wabaId: string;
  finishEvent: string;
}

const FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  "FINISH_OBO_MIGRATION",
  "FINISH_GRANT_ONLY_API_ACCESS",
]);

function isFacebookOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "facebook.com" ||
      hostname.endsWith(".facebook.com") ||
      hostname === "meta.com" ||
      hostname.endsWith(".meta.com")
    );
  } catch {
    return false;
  }
}

export function listenEmbeddedSignup(
  onSession: (session: EmbeddedSignupSession) => void,
  onCancel: (message: string) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    if (!isFacebookOrigin(event.origin)) return;

    let payload: {
      type?: string;
      event?: string;
      data?: {
        phone_number_id?: string;
        waba_id?: string;
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

    if (payload.event && FINISH_EVENTS.has(payload.event)) {
      const phoneNumberId = payload.data?.phone_number_id;
      const wabaId = payload.data?.waba_id;
      if (phoneNumberId && wabaId) {
        onSession({
          phoneNumberId,
          wabaId,
          finishEvent: payload.event,
        });
      }
      return;
    }

    if (payload.event === "FINISH_ONLY_WABA") {
      onCancel("Please add your business phone number before finishing setup.");
      return;
    }

    if (payload.event === "CANCEL" || payload.event === "ERROR") {
      const msg =
        payload.data?.error_message ??
        (payload.event === "ERROR"
          ? "Facebook could not complete WhatsApp setup."
          : payload.data?.current_step
            ? "Setup was closed before finishing. You can try again anytime."
            : "Setup was cancelled.");
      onCancel(msg);
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

function formatFbLoginError(response: {
  status?: string;
  error?: string;
  errorMessage?: string;
}): string {
  const detail = response.errorMessage ?? response.error;
  if (detail) {
    return detail;
  }
  if (response.status === "unknown") {
    return (
      "Facebook could not complete login (JSSDK unknown error). " +
      "Allow popups, use your production domain (e.g. www.growvisi.com), and add that domain under Meta → Facebook Login for Business → Allowed Domains with Login with JavaScript SDK enabled."
    );
  }
  if (response.status === "not_authorized") {
    return "Facebook login was not completed. Please try again and finish all steps in the popup.";
  }
  return "Could not authorize with Facebook. Please try again.";
}

const LOGIN_TIMEOUT_MS = 180_000;

export const META_OAUTH_CALLBACK_PATH = "/meta/oauth/callback";

export function getMetaOAuthRedirectUri(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return `${window.location.origin}${META_OAUTH_CALLBACK_PATH}`;
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

/**
 * Direct OAuth dialog — more reliable than FB.login alone for WhatsApp Embedded Signup.
 * FB.login without featureType often lands users on facebook.com feed after password entry.
 */
export function launchEmbeddedSignupViaOAuth(
  appId: string,
  configId: string,
  graphApiVersion: string,
  solutionId?: string,
): Promise<string> {
  const cfg = configId?.trim();
  if (!cfg) {
    return Promise.reject(new Error("Missing Embedded Signup configuration ID."));
  }

  const redirectUri = getMetaOAuthRedirectUri();
  if (!redirectUri) {
    return Promise.reject(new Error("OAuth redirect URI is not available in this context."));
  }

  return new Promise((resolve, reject) => {
    const version = normalizeGraphVersion(graphApiVersion || "v21.0");
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
      client_id: appId.trim(),
      redirect_uri: redirectUri,
      config_id: cfg,
      response_type: "code",
      override_default_response_type: "true",
      auth_type: "rerequest",
      state,
    });

    const extras = buildEmbeddedSignupExtras(solutionId);
    params.set("extras", JSON.stringify(extras));

    const url = `https://www.facebook.com/${version}/dialog/oauth?${params.toString()}`;
    const popup = window.open(
      url,
      "growvisi_meta_oauth",
      "width=600,height=720,scrollbars=yes,resizable=yes",
    );

    if (!popup) {
      reject(
        new Error(
          "Popup blocked. Allow popups for this site, then click Try again and complete setup in the Facebook window.",
        ),
      );
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Facebook login timed out. Complete every step in the popup—including picking your WhatsApp number.",
          ),
        ),
      );
    }, LOGIN_TIMEOUT_MS);

    const poll = window.setInterval(() => {
      if (popup.closed && !settled) {
        finish(() => reject(new Error("Facebook login was closed before setup finished.")));
      }
    }, 500);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        code?: string;
        error?: string;
        state?: string;
      };
      if (data?.type !== "META_OAUTH_CALLBACK" || data.state !== state) return;

      if (data.code) {
        const authCode = data.code;
        finish(() => resolve(authCode));
      } else {
        finish(() => reject(new Error(data.error ?? "Facebook login was not completed.")));
      }
    };

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener("message", onMessage);
      action();
    };

    window.addEventListener("message", onMessage);
  });
}

/** FB.login fallback — includes featureType required for WhatsApp onboarding (Chatwoot/Twilio pattern). */
export function launchEmbeddedSignupViaSdk(
  configId: string,
  solutionId?: string,
): Promise<string> {
  const cfg = configId?.trim();
  if (!cfg) {
    return Promise.reject(
      new Error(
        "WhatsApp connection is not configured (missing Embedded Signup config ID). Set META_EMBEDDED_SIGNUP_CONFIG_ID on the API.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK not ready"));
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Facebook login timed out. Allow popups, then try again and complete every step in the Facebook window.",
          ),
        ),
      );
    }, LOGIN_TIMEOUT_MS);

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      action();
    };

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (code) {
          finish(() => resolve(code));
          return;
        }
        finish(() => reject(new Error(formatFbLoginError(response))));
      },
      {
        config_id: cfg,
        auth_type: "rerequest",
        response_type: "code",
        override_default_response_type: true,
        extras: buildEmbeddedSignupExtras(solutionId),
      },
    );
  });
}

/** Prefer OAuth dialog; fall back to FB.login if popup OAuth fails to open. */
export async function launchEmbeddedSignup(
  appId: string,
  configId: string,
  graphApiVersion: string,
  solutionId?: string,
): Promise<string> {
  try {
    return await launchEmbeddedSignupViaOAuth(appId, configId, graphApiVersion, solutionId);
  } catch (oauthError) {
    await loadFacebookSdk(appId, graphApiVersion);
    try {
      return await launchEmbeddedSignupViaSdk(configId, solutionId);
    } catch (sdkError) {
      const oauthMsg = oauthError instanceof Error ? oauthError.message : String(oauthError);
      const sdkMsg = sdkError instanceof Error ? sdkError.message : String(sdkError);
      throw new Error(`${oauthMsg} (SDK fallback: ${sdkMsg})`);
    }
  }
}
