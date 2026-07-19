import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { useMutationPendingId } from "./use-mutation-pending-id";

describe("useMutationPendingId", () => {
  it("returns variables while pending", () => {
    const pending = useMutationPendingId({
      isPending: true,
      variables: "retail",
    });
    assert.equal(pending, "retail");
  });

  it("returns undefined when idle", () => {
    const pending = useMutationPendingId({
      isPending: false,
      variables: "retail",
    });
    assert.equal(pending, undefined);
  });
});
