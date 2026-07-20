import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./query-config";
import { handleMessageNewCacheUpdate } from "./realtime-inbox-cache";
import { setActiveInboxConversationId } from "./inbox-active-thread";

describe("handleMessageNewCacheUpdate", () => {
  it("patches list and stats on inbound without invalidating all conversations", () => {
    const client = new QueryClient();
    client.setQueryData(["conversations", "", "all", "active"], {
      data: [
        {
          id: "c2",
          unreadCount: 0,
          lastMessageAt: "2026-01-01T00:00:00.000Z",
          messages: [{ content: "old" }],
          lead: null,
        },
        {
          id: "c1",
          unreadCount: 1,
          lastMessageAt: "2026-01-01T00:00:00.000Z",
          messages: [{ content: "prior" }],
          lead: null,
        },
      ],
    });
    client.setQueryData(QUERY_KEYS.conversationQueueStats, { unreadMessages: 5 });

    handleMessageNewCacheUpdate(
      client,
      {
        conversationId: "c1",
        messageId: "m1",
        direction: "INBOUND",
        content: "hello",
        createdAt: "2026-07-20T12:00:00.000Z",
      },
      { activeConversationId: null },
    );

    const list = client.getQueryData<{ data: Array<{ id: string; unreadCount: number }> }>([
      "conversations",
      "",
      "all",
      "active",
    ]);
    assert.equal(list?.data[0]?.id, "c1");
    assert.equal(list?.data[0]?.unreadCount, 2);
    assert.equal(
      client.getQueryData<{ unreadMessages: number }>(QUERY_KEYS.conversationQueueStats)
        ?.unreadMessages,
      6,
    );
  });

  it("appends to open thread when active without list unread bump", () => {
    const client = new QueryClient();
    setActiveInboxConversationId("c1");
    client.setQueryData(QUERY_KEYS.conversation("c1"), {
      id: "c1",
      unreadCount: 0,
      messages: [],
    });
    client.setQueryData(["conversations", "", "all", "active"], {
      data: [
        {
          id: "c1",
          unreadCount: 0,
          lastMessageAt: null,
          messages: [],
          lead: null,
        },
      ],
    });

    handleMessageNewCacheUpdate(
      client,
      {
        conversationId: "c1",
        messageId: "m2",
        direction: "INBOUND",
        content: "live",
        createdAt: "2026-07-20T12:01:00.000Z",
      },
      { activeConversationId: "c1" },
    );

    const thread = client.getQueryData<{ messages: Array<{ id: string; content: string | null }> }>(
      QUERY_KEYS.conversation("c1"),
    );
    assert.equal(thread?.messages.length, 1);
    assert.equal(thread?.messages[0]?.content, "live");

    setActiveInboxConversationId(null);
  });
});
