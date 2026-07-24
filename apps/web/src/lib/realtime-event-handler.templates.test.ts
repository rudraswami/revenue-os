import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleRealtimeEvent } from "./realtime-event-handler";

describe("handleRealtimeEvent templates.updated", () => {
  it("invalidates template query caches", () => {
    const calls: unknown[][] = [];
    const queryClient = {
      invalidateQueries: (args: unknown) => {
        calls.push([args]);
        return Promise.resolve();
      },
    } as never;

    handleRealtimeEvent(queryClient, "templates.updated");

    assert.deepEqual(calls, [
      [{ queryKey: ["message-templates"] }],
      [{ queryKey: ["whatsapp-templates"] }],
    ]);
  });
});
