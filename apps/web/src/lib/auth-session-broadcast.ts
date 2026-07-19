import type { LogoutReason } from "@/lib/auth-session-death";

const STORAGE_KEY = "growvisi-session-ended";
const CHANNEL_NAME = "growvisi-session-ended";

type SessionEndedPayload = { reason: LogoutReason; at: number };

/** Notify other tabs that the session ended (logout or auth death). */
export function broadcastSessionEnded(reason: LogoutReason): void {
  if (typeof window === "undefined") return;
  const payload: SessionEndedPayload = { reason, at: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  } catch {
    /* unsupported */
  }
}

export function subscribeSessionEnded(onEnded: (reason: LogoutReason) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handle = (payload: SessionEndedPayload | null) => {
    if (payload?.reason) onEnded(payload.reason);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      handle(JSON.parse(event.newValue) as SessionEndedPayload);
    } catch {
      /* ignore */
    }
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<SessionEndedPayload>) => {
      handle(event.data ?? null);
    };
  } catch {
    /* unsupported */
  }

  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
