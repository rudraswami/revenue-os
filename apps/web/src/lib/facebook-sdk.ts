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
          authResponse?: { code?: string };
          status?: string;
          error?: string;
          errorMessage?: string;
        }) => void,
        options: {
          config_id: string;
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

function normalizeGraphVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
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

  if (window.FB) {
    return Promise.resolve();
  }

  const version = normalizeGraphVersion(graphApiVersion || "v21.0");

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      window.fbAsyncInit = () => {
        try {
          window.FB?.init({
            appId: id,
            autoLogAppEvents: true,
            xfbml: true,
            version,
          });
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Facebook SDK init failed"));
        }
      };

      const existing = document.getElementById("facebook-jssdk");
      if (existing) {
        existing.addEventListener("load", () => resolve());
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

export function listenEmbeddedSignup(
  onSession: (session: EmbeddedSignupSession) => void,
  onCancel: (message: string) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    if (!event.origin.endsWith("facebook.com")) return;

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

    if (payload.event === "CANCEL") {
      const msg =
        payload.data?.error_message ??
        (payload.data?.current_step
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
      "Use https://www.growvisi.com, allow popups, and ensure Meta app settings list growvisi.com and www.growvisi.com under Allowed Domains with Login with JavaScript SDK enabled."
    );
  }
  return "Could not authorize with Facebook. Please try again.";
}

export function launchEmbeddedSignup(configId: string): Promise<string> {
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

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (code) {
          resolve(code);
          return;
        }
        if (response.status === "unknown" || !response.authResponse) {
          reject(new Error(formatFbLoginError(response)));
          return;
        }
        reject(new Error(formatFbLoginError(response)));
      },
      {
        config_id: cfg,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
        },
      },
    );
  });
}
