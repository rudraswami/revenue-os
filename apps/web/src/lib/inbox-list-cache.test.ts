import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InfiniteData } from "@tanstack/react-query";
import {
  bumpConversationListRow,
  patchConversationListRow,
  type InboxListPage,
} from "./inbox-list-cache";

describe("inbox-list-cache", () => {
  const row = {
    id: "c1",
    unreadCount: 2,
    lastMessageAt: "2026-01-01T00:00:00.000Z",
    requiresHuman: true,
    messages: [{ content: "Hi" }],
    lead: { id: "l1", stage: "NEW" },
  };

  it("patches a flat list row", () => {
    const cached: InboxListPage = { data: [row] };
    const next = patchConversationListRow(cached, "c1", (r) => ({
      ...r,
      unreadCount: 0,
    }));
    assert.ok(next && !("pages" in next));
    assert.equal(next.data[0].unreadCount, 0);
  });

  it("patches infinite list pages", () => {
    const cached: InfiniteData<InboxListPage> = {
      pages: [{ data: [row], hasMore: true }],
      pageParams: [1],
    };
    const next = patchConversationListRow(cached, "c1", (r) => ({
      ...r,
      unreadCount: 0,
    }));
    assert.ok(next && "pages" in next);
    assert.equal(next.pages[0].data[0].unreadCount, 0);
  });

  it("bumps a row to the top of the first page", () => {
    const other = { ...row, id: "c2", messages: [{ content: "Other" }] };
    const cached: InfiniteData<InboxListPage> = {
      pages: [
        { data: [other] },
        { data: [row] },
      ],
      pageParams: [1, 2],
    };
    const updated = {
      ...row,
      lastMessageAt: "2026-01-02T00:00:00.000Z",
      messages: [{ content: "New reply" }],
      unreadCount: 0,
    };
    const next = bumpConversationListRow(cached, "c1", updated);
    assert.ok(next && "pages" in next);
    assert.equal(next.pages[0].data[0].id, "c1");
    assert.equal(next.pages[1].data.length, 0);
  });
});
