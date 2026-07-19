import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { applyMeResponse } from "./auth-session";
import { readPersistedRefreshToken, persistRefreshToken } from "./refresh-token-persist";
import { useAuthStore } from "@/stores/auth-store";
import type { MeResponse } from "./auth-types";

const meFixture: MeResponse = {
  user: { id: "u1", email: "a@b.com", name: "A", emailVerified: null },
  organization: { id: "o1", name: "Org", slug: "org" },
  role: "OWNER",
  onboarding: { whatsappConnected: true, firstMessageReceived: true, complete: true },
};

describe("applyMeResponse", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    (globalThis as { sessionStorage?: Storage }).sessionStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    };
    useAuthStore.setState({
      accessToken: "access",
      refreshToken: null,
      user: meFixture.user,
      organization: meFixture.organization,
      role: meFixture.role,
      onboarding: meFixture.onboarding,
      hydrated: true,
      lastTransientFailure: null,
      roleChangeNotice: null,
      onboardingDismissed: false,
    });
    persistRefreshToken("rt-backup-secret");
  });

  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
    useAuthStore.getState().clear("USER_SIGN_OUT");
  });

  it("does not wipe sessionStorage refresh token backup", () => {
    applyMeResponse({
      ...meFixture,
      user: { ...meFixture.user, name: "Updated" },
    });
    assert.equal(readPersistedRefreshToken(), "rt-backup-secret");
    assert.equal(useAuthStore.getState().user?.name, "Updated");
    assert.equal(useAuthStore.getState().refreshToken, null);
  });
});
