import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  clearInboxDraft,
  loadInboxDraft,
  saveInboxDraft,
} from "./inbox-draft-storage";

describe("inbox-draft-storage", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    const mock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    };
    Object.defineProperty(globalThis, "sessionStorage", {
      value: mock,
      configurable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "sessionStorage");
  });

  it("round-trips draft per conversation", () => {
    saveInboxDraft("c1", { text: "Hello", meta: null });
    assert.deepEqual(loadInboxDraft("c1"), { text: "Hello", meta: null });
    assert.equal(loadInboxDraft("c2"), null);
  });

  it("clears empty drafts", () => {
    saveInboxDraft("c1", { text: "Hi", meta: null });
    saveInboxDraft("c1", { text: "  ", meta: null });
    assert.equal(loadInboxDraft("c1"), null);
  });

  it("clearInboxDraft removes key", () => {
    saveInboxDraft("c1", { text: "x", meta: null });
    clearInboxDraft("c1");
    assert.equal(loadInboxDraft("c1"), null);
  });
});
