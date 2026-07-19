import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { autonomyLabel, presetLabel } from "./automation-scenarios";

describe("automation-scenarios labels", () => {
  it("autonomyLabel returns human titles", () => {
    assert.equal(autonomyLabel("intel_only"), "I'll reply myself");
    assert.equal(autonomyLabel("assist"), "Draft for me");
    assert.equal(autonomyLabel("auto_guarded"), "WhatsApp auto-reply");
  });

  it("presetLabel returns preset titles", () => {
    assert.equal(presetLabel("careful"), "Hello & thanks");
    assert.equal(presetLabel("balanced"), "FAQs from your docs");
    assert.equal(presetLabel("responsive"), "Broader auto-replies");
  });
});
