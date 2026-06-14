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
      "Use https://www.growvisi.in, allow popups, and add growvisi.in and www.growvisi.in under Meta → Facebook Login → Allowed Domains with Login with JavaScript SDK enabled."
    );
  }
  if (response.status === "not_authorized") {
    return "Facebook login was not completed. Please try again and finish all steps in the popup.";
  }
  return "Could not authorize with Facebook. Please try again.";
}

const LOGIN_TIMEOUT_MS = 180_000;

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

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          "Facebook login timed out. Allow popups for growvisi.in, then try again and complete every step—including picking your WhatsApp number.",
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
