import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  clearPersistedRefreshToken,
  persistRefreshToken,
  readPersistedRefreshToken,
} from "./refresh-token-persist";

describe("refresh-token-persist", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    (globalThis as { sessionStorage?: Storage }).sessionStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => {
        storage.set(k, v);
      },
      removeItem: (k) => {
        storage.delete(k);
      },
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    };
  });

  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  });

  it("round-trips refresh token in sessionStorage", () => {
    persistRefreshToken("rt-secret");
    assert.equal(readPersistedRefreshToken(), "rt-secret");
    clearPersistedRefreshToken();
    assert.equal(readPersistedRefreshToken(), null);
  });
});
