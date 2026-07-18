const STORAGE_KEY = "growvisi-email-verified";
const CHANNEL_NAME = "growvisi-email-verified";

/** Notify other tabs that email was verified (e.g. from /verify-email link). */
export function broadcastEmailVerified(emailVerified: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, emailVerified);
  } catch {
    /* private mode */
  }
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ emailVerified });
    channel.close();
  } catch {
    /* unsupported */
  }
}

export function subscribeEmailVerified(onVerified: (emailVerified: string) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      onVerified(event.newValue);
    }
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<{ emailVerified?: string }>) => {
      if (event.data?.emailVerified) onVerified(event.data.emailVerified);
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
