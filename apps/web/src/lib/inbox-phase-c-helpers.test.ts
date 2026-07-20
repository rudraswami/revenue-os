import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { followUpDueAt, formatFollowUpTaskTitle } from "./inbox-follow-up-task";
import { isPaymentAssistCandidate } from "./inbox-payment-assist";
import {
  formatSessionTimeLeft,
  isMessagingWindowOpen,
  messagingWindowRemainingMs,
} from "./inbox-session-status";

describe("inbox-payment-assist", () => {
  it("flags payment-related image captions", () => {
    assert.equal(isPaymentAssistCandidate("IMAGE", "UPI payment done"), true);
    assert.equal(isPaymentAssistCandidate("TEXT", "hello"), false);
  });
});

describe("inbox-session-status", () => {
  it("detects open messaging window", () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    assert.equal(isMessagingWindowOpen(recent), true);
    assert.ok(messagingWindowRemainingMs(recent) > 0);
    assert.match(formatSessionTimeLeft(90 * 60 * 1000, "en"), /left/);
  });
});

describe("inbox-follow-up-task", () => {
  it("builds follow-up title with excerpt", () => {
    assert.match(formatFollowUpTaskTitle("Ravi", "Need quote"), /Ravi/);
    assert.ok(followUpDueAt("tomorrow").getTime() > Date.now());
  });
});
