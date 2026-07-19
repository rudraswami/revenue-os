import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  appendOptimisticOutboundMessage,
  createOptimisticOutboundMessage,
  patchConversationAsRead,
  patchConversationHandoffResolved,
  patchConversationListsAfterOutbound,
  patchThreadLeadStage,
  replaceOptimisticOutboundMessage,
} from "./inbox-query-cache";

describe("patchConversationAsRead", () => {
  it("clears unread in list, thread, and stats", () => {
    const client = new QueryClient();
    client.setQueryData(["conversation", "c1"], {
      id: "c1",
      unreadCount: 3,
      messages: [],
    });
    client.setQueryData(["conversations", "", "all", "active"], {
      data: [{ id: "c1", unreadCount: 3, lastMessageAt: null, messages: [], lead: null }],
    });
    client.setQueryData(["conversation-stats"], { unreadMessages: 10 });

    patchConversationAsRead(client, "c1");

    assert.equal(
      client.getQueryData<{ unreadCount: number }>(["conversation", "c1"])?.unreadCount,
      0,
    );
    assert.equal(
      client.getQueryData<{ data: Array<{ unreadCount: number }> }>([
        "conversations",
        "",
        "all",
        "active",
      ])?.data[0]?.unreadCount,
      0,
    );
    assert.equal(
      client.getQueryData<{ unreadMessages: number }>(["conversation-stats"])?.unreadMessages,
      7,
    );
  });
});

describe("patchConversationHandoffResolved", () => {
  it("clears handoff in thread, list, and stats", () => {
    const client = new QueryClient();
    client.setQueryData(["conversation", "c1"], {
      id: "c1",
      unreadCount: 0,
      requiresHuman: true,
      handoffReason: "Pricing question",
      messages: [],
    });
    client.setQueryData(["conversations", "", "all", "active"], {
      data: [
        {
          id: "c1",
          unreadCount: 0,
          lastMessageAt: null,
          requiresHuman: true,
          messages: [],
          lead: null,
        },
      ],
    });
    client.setQueryData(["conversation-stats"], {
      humanHandoffRecommended: 5,
      queue: { yourTurn: 3 },
    });

    patchConversationHandoffResolved(client, "c1");

    const thread = client.getQueryData<{
      requiresHuman: boolean;
      handoffReason: string | null;
    }>(["conversation", "c1"]);
    assert.equal(thread?.requiresHuman, false);
    assert.equal(thread?.handoffReason, null);
    assert.equal(
      client.getQueryData<{ data: Array<{ requiresHuman?: boolean }> }>([
        "conversations",
        "",
        "all",
        "active",
      ])?.data[0]?.requiresHuman,
      false,
    );
    const stats = client.getQueryData<{
      humanHandoffRecommended: number;
      queue: { yourTurn: number };
    }>(["conversation-stats"]);
    assert.equal(stats?.humanHandoffRecommended, 4);
    assert.equal(stats?.queue.yourTurn, 2);
  });
});

describe("patchThreadLeadStage", () => {
  it("updates lead stage in thread and list caches", () => {
    const client = new QueryClient();
    client.setQueryData(["conversation", "c1"], {
      id: "c1",
      unreadCount: 0,
      messages: [],
      lead: { id: "l1", stage: "NEW" },
    });
    client.setQueryData(["conversations", "", "all", "active"], {
      data: [
        {
          id: "c1",
          unreadCount: 0,
          lastMessageAt: null,
          messages: [],
          lead: { id: "l1", stage: "NEW" },
        },
      ],
    });

    patchThreadLeadStage(client, "c1", "QUALIFIED");

    assert.equal(
      client.getQueryData<{ lead: { stage: string } }>(["conversation", "c1"])?.lead?.stage,
      "QUALIFIED",
    );
    assert.equal(
      client.getQueryData<{ data: Array<{ lead: { stage: string } | null }> }>([
        "conversations",
        "",
        "all",
        "active",
      ])?.data[0]?.lead?.stage,
      "QUALIFIED",
    );
  });
});

describe("optimistic outbound", () => {
  it("appends and replaces pending message", () => {
    const client = new QueryClient();
    client.setQueryData(["conversation", "c1"], {
      id: "c1",
      unreadCount: 0,
      messages: [],
    });

    const optimistic = createOptimisticOutboundMessage("Hi", "optimistic-1");
    appendOptimisticOutboundMessage(client, "c1", optimistic);

    assert.equal(
      client.getQueryData<{ messages: unknown[] }>(["conversation", "c1"])?.messages.length,
      1,
    );

    replaceOptimisticOutboundMessage(client, "c1", "optimistic-1", {
      id: "real-1",
      direction: "OUTBOUND",
      type: "TEXT",
      content: "Hi",
      createdAt: new Date().toISOString(),
      status: "SENT",
    });

    const message = client.getQueryData<{ messages: Array<{ id: string; status: string }> }>([
      "conversation",
      "c1",
    ])?.messages[0];
    assert.equal(message?.id, "real-1");
    assert.equal(message?.status, "SENT");
  });

  it("moves conversation to top of list after send", () => {
    const client = new QueryClient();
    const createdAt = "2026-07-19T10:00:00.000Z";
    client.setQueryData(["conversations", "", "all", "active"], {
      data: [
        { id: "c2", unreadCount: 0, lastMessageAt: "2026-07-19T09:00:00.000Z", messages: [], lead: null },
        { id: "c1", unreadCount: 0, lastMessageAt: "2026-07-19T08:00:00.000Z", messages: [], lead: null },
      ],
    });

    patchConversationListsAfterOutbound(client, "c1", "Hello", createdAt);

    const data =
      client.getQueryData<{ data: Array<{ id: string; messages: Array<{ content: string }> }> }>([
        "conversations",
        "",
        "all",
        "active",
      ])?.data ?? [];
    assert.equal(data[0]?.id, "c1");
    assert.equal(data[0]?.messages[0]?.content, "Hello");
  });
});
