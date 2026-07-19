/**
 * Cross-tab refresh coordination.
 * One tab refreshes; others wait and apply the shared session (access + refresh tokens).
 */

const LOCK_KEY = "growvisi-refresh-lock";
const RESULT_KEY = "growvisi-refresh-result";
const CHANNEL = "growvisi-auth";
const LOCK_TTL_MS = 12_000;
const WAIT_TIMEOUT_MS = 15_000;

/** Published when a tab completes refresh — includes refresh token for peer tabs. */
export type SharedSessionPayload = {
  type: "SESSION_REFRESHED";
  accessToken: string;
  refreshToken: string;
  at: number;
};

/** @deprecated Legacy payload — still handled for in-flight tabs during deploy. */
type LegacyAccessPayload = {
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

function parseSharedPayload(data: unknown): SharedSessionPayload | null {
  if (!data || typeof data !== "object") return null;
  const payload = data as SharedSessionPayload | LegacyAccessPayload;
  if (payload.type === "SESSION_REFRESHED" && payload.accessToken && payload.refreshToken) {
    return payload;
  }
  if (payload.type === "ACCESS_TOKEN" && payload.accessToken) {
    return {
      type: "SESSION_REFRESHED",
      accessToken: payload.accessToken,
      refreshToken: "",
      at: payload.at,
    };
  }
  return null;
}

function publishSession(payload: SharedSessionPayload): void {
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
 */
export function waitForPeerRefresh(): Promise<SharedSessionPayload | null> {
  if (typeof window === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (session: SharedSessionPayload | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(session);
    };

    const onMessage = (data: unknown) => {
      const session = parseSharedPayload(data);
      if (session) finish(session);
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

    try {
      const raw = localStorage.getItem(RESULT_KEY);
      if (raw) {
        const session = parseSharedPayload(JSON.parse(raw));
        if (session && Date.now() - session.at < LOCK_TTL_MS) {
          finish(session);
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
  peerSession: SharedSessionPayload | null;
}> {
  if (typeof window === "undefined") {
    return { ran: true, value: await run(), peerSession: null };
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
      return { ran: true, value, peerSession: null };
    } catch {
      // Fall through to storage-based lock
    }
  }

  if (!tryAcquireLock()) {
    const peerSession = await waitForPeerRefresh();
    return { ran: false, value: null, peerSession };
  }

  try {
    const value = await run();
    return { ran: true, value, peerSession: null };
  } finally {
    releaseLock();
  }
}

export function clearRefreshCoordination(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(RESULT_KEY);
}

export function shareRefreshedSession(accessToken: string, refreshToken: string): void {
  publishSession({
    type: "SESSION_REFRESHED",
    accessToken,
    refreshToken,
    at: Date.now(),
  });
}

/** @deprecated use shareRefreshedSession */
export function shareAccessToken(accessToken: string): void {
  publishSession({
    type: "SESSION_REFRESHED",
    accessToken,
    refreshToken: "",
    at: Date.now(),
  });
}

/** Subscribe to peer session updates (other tabs). Returns unsubscribe. */
export function subscribePeerSessions(
  onSession: (session: SharedSessionPayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handle = (data: unknown) => {
    const session = parseSharedPayload(data);
    if (session) onSession(session);
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

/** @deprecated use subscribePeerSessions */
export function subscribePeerAccessTokens(onToken: (accessToken: string) => void): () => void {
  return subscribePeerSessions((session) => onToken(session.accessToken));
}
