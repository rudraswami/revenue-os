import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inboxListQueueBadges } from "./inbox-list-queue-signal";

describe("inbox-list-queue-signal", () => {
  const stageLabel = (s: string) => s;

  it("prioritizes your turn and deal value over stage", () => {
    const badges = inboxListQueueBadges(
      { stage: "QUALIFIED", score: 80, valueCents: 250_000_00 },
      { yourTurn: true, stageLabel },
    );
    assert.deepEqual(badges.map((b) => b.kind), ["your_turn", "deal_value", "hot_score"]);
  });

  it("shows stage only for closed deals when no stronger signals", () => {
    const badges = inboxListQueueBadges(
      { stage: "WON", score: 10, valueCents: null },
      { closed: true, stageLabel },
    );
    assert.equal(badges[0]?.kind, "stage");
  });

  it("omits stage for active pipeline without value or hot score", () => {
    const badges = inboxListQueueBadges(
      { stage: "NEW", score: 20, valueCents: null },
      { stageLabel },
    );
    assert.equal(badges.length, 0);
  });
});
