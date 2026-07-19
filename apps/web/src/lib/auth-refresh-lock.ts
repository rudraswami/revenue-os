/**
 * Cross-tab refresh coordination.
 * One tab refreshes; others wait and apply the shared access token.
 */

const LOCK_KEY = "growvisi-refresh-lock";
const RESULT_KEY = "growvisi-refresh-result";
const CHANNEL = "growvisi-auth";
const LOCK_TTL_MS = 12_000;
const WAIT_TIMEOUT_MS = 15_000;

export type SharedAccessPayload = {
  type: "ACCESS_TOKEN";
  accessToken: string;
  at: number;
};

type LockPayload = { owner: string; until: number };

function tabId(): string {
  if (typeof window === "undefined") return "ssr";
  const w = window as Window & { __growvisiTabId?: string };
  if (!w.__growvisiTabId) {
    w.__growvisiTabId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return w.__growvisiTabId;
}

function readLock(): LockPayload | null {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LockPayload;
  } catch {
    return null;
  }
}

function tryAcquireLock(): boolean {
  if (typeof localStorage === "undefined") return true;
  const now = Date.now();
  const existing = readLock();
  if (existing && existing.until > now && existing.owner !== tabId()) {
    return false;
  }
  const payload: LockPayload = { owner: tabId(), until: now + LOCK_TTL_MS };
  localStorage.setItem(LOCK_KEY, JSON.stringify(payload));
  // Confirm we won (naive CAS)
  const confirmed = readLock();
  return !!confirmed && confirmed.owner === tabId();
}

function releaseLock(): void {
  if (typeof localStorage === "undefined") return;
  const existing = readLock();
  if (existing?.owner === tabId()) {
    localStorage.removeItem(LOCK_KEY);
  }
}

function publishAccess(payload: SharedAccessPayload): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(RESULT_KEY, JSON.stringify(payload));
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage(payload);
    ch.close();
  } catch {
    // BroadcastChannel unsupported — storage event still notifies other tabs
  }
}

/**
 * Wait for another tab to finish refresh, or timeout.
 * Resolves with accessToken if shared, else null.
 */
export function waitForPeerRefresh(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(token);
    };

    const onMessage = (data: unknown) => {
      const payload = data as SharedAccessPayload;
      if (payload?.type === "ACCESS_TOKEN" && payload.accessToken) {
        finish(payload.accessToken);
      }
    };

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(CHANNEL);
      ch.onmessage = (ev) => onMessage(ev.data);
    } catch {
      ch = null;
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === RESULT_KEY && ev.newValue) {
        try {
          onMessage(JSON.parse(ev.newValue));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);

    // Already published?
    try {
      const raw = localStorage.getItem(RESULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SharedAccessPayload;
        if (parsed?.type === "ACCESS_TOKEN" && Date.now() - parsed.at < LOCK_TTL_MS) {
          finish(parsed.accessToken);
          return;
        }
      }
    } catch {
      /* ignore */
    }

    const timer = window.setTimeout(() => finish(null), WAIT_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      ch?.close();
    }
  });
}

export async function withRefreshLock<T>(run: () => Promise<T>): Promise<{
  ran: boolean;
  value: T | null;
  peerToken: string | null;
}> {
  if (typeof window === "undefined") {
    return { ran: true, value: await run(), peerToken: null };
  }

  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    try {
      let value: T | null = null;
      await navigator.locks.request(
        "growvisi-auth-refresh",
        { ifAvailable: false },
        async () => {
          value = await run();
        },
      );
      return { ran: true, value, peerToken: null };
    } catch {
      // Fall through to storage-based lock
    }
  }

  if (!tryAcquireLock()) {
    const peerToken = await waitForPeerRefresh();
    return { ran: false, value: null, peerToken };
  }

  try {
    const value = await run();
    return { ran: true, value, peerToken: null };
  } finally {
    releaseLock();
  }
}

export function clearRefreshCoordination(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(RESULT_KEY);
}

export function shareAccessToken(accessToken: string): void {
  publishAccess({
    type: "ACCESS_TOKEN",
    accessToken,
    at: Date.now(),
  });
}

/** Subscribe to peer access-token updates (other tabs). Returns unsubscribe. */
export function subscribePeerAccessTokens(onToken: (accessToken: string) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handle = (data: unknown) => {
    const payload = data as SharedAccessPayload;
    if (payload?.type === "ACCESS_TOKEN" && payload.accessToken) {
      onToken(payload.accessToken);
    }
  };

  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (ev) => handle(ev.data);
  } catch {
    ch = null;
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key === RESULT_KEY && ev.newValue) {
      try {
        handle(JSON.parse(ev.newValue));
      } catch {
        /* ignore */
      }
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
    ch?.close();
  };
}
