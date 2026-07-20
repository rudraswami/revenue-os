import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loadInboxInsightsOpen,
  shouldAutoOpenInboxInsights,
} from "./inbox-insights-preference";

describe("inbox-insights-preference", () => {
  it("defaults insights panel to collapsed", () => {
    assert.equal(loadInboxInsightsOpen(), false);
  });

  it("auto-opens on handoff", () => {
    assert.equal(shouldAutoOpenInboxInsights({ requiresHuman: true }), true);
  });

  it("auto-opens on low confidence", () => {
    assert.equal(shouldAutoOpenInboxInsights({ aiConfidence: 0.4 }), true);
    assert.equal(shouldAutoOpenInboxInsights({ aiConfidence: 0.9 }), false);
  });

  it("auto-opens on high deal value", () => {
    assert.equal(shouldAutoOpenInboxInsights({ valueCents: 600_000 }), true);
    assert.equal(shouldAutoOpenInboxInsights({ valueCents: 10_000 }), false);
  });
});
