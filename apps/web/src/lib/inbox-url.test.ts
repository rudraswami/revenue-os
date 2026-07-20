import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inboxConversationIdFromParams } from "./inbox-url";

describe("inbox-url", () => {
  it("prefers c param", () => {
    const params = new URLSearchParams("c=abc&conversation=legacy");
    assert.equal(inboxConversationIdFromParams(params), "abc");
  });

  it("falls back to conversation param", () => {
    const params = new URLSearchParams("conversation=legacy");
    assert.equal(inboxConversationIdFromParams(params), "legacy");
  });

  it("returns null when missing", () => {
    assert.equal(inboxConversationIdFromParams(new URLSearchParams()), null);
  });
});
