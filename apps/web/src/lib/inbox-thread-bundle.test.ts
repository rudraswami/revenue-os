import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";
import {
  conversationIdFromThreadKey,
  seedInboxThreadBundleCache,
  syncInboxThreadBundleConversation,
  syncInboxThreadBundleInboxContext,
} from "@/lib/inbox-thread-bundle";

describe("inbox-thread-bundle cache", () => {
  it("conversationIdFromThreadKey extracts id from query key", () => {
    assert.equal(conversationIdFromThreadKey(["conversation-thread", "c9"]), "c9");
    assert.equal(conversationIdFromThreadKey(["conversation", "c9"]), undefined);
  });

  it("seedInboxThreadBundleCache writes bundle + legacy slice keys", () => {
    const client = new QueryClient();
    const bundle = {
      conversation: { id: "c1", unreadCount: 1, messages: [] },
      inboxContext: { kbHealth: { chunkCount: 2, docCount: 0, quickAnswerCount: 0, lastIndexedAt: null, gapRiskScore: 0, readyForResponsivePreset: true } },
    };

    seedInboxThreadBundleCache(client, "c1", bundle);

    assert.deepEqual(client.getQueryData(QUERY_KEYS.conversationThread("c1")), bundle);
    assert.deepEqual(client.getQueryData(QUERY_KEYS.conversation("c1")), bundle.conversation);
    assert.deepEqual(
      client.getQueryData(QUERY_KEYS.conversationInboxContext("c1")),
      bundle.inboxContext,
    );
  });

  it("syncInboxThreadBundleConversation keeps bundle.conversation aligned", () => {
    const client = new QueryClient();
    const bundle = {
      conversation: { id: "c1", unreadCount: 2, messages: [] },
      inboxContext: {},
    };
    seedInboxThreadBundleCache(client, "c1", bundle);

    syncInboxThreadBundleConversation(client, "c1", {
      id: "c1",
      unreadCount: 0,
      messages: [],
    });

    assert.equal(
      client.getQueryData<{ conversation: { unreadCount: number } }>(
        QUERY_KEYS.conversationThread("c1"),
      )?.conversation.unreadCount,
      0,
    );
    assert.equal(
      client.getQueryData<{ unreadCount: number }>(QUERY_KEYS.conversation("c1"))?.unreadCount,
      0,
    );
  });

  it("syncInboxThreadBundleInboxContext keeps bundle.inboxContext aligned", () => {
    const client = new QueryClient();
    const bundle = {
      conversation: { id: "c1", unreadCount: 1, messages: [] },
      inboxContext: {
        kbHealth: {
          chunkCount: 1,
          docCount: 0,
          quickAnswerCount: 0,
          lastIndexedAt: null,
          gapRiskScore: 0,
          readyForResponsivePreset: false,
        },
      },
    };
    seedInboxThreadBundleCache(client, "c1", bundle);

    const nextContext = {
      kbHealth: { chunkCount: 3 },
      replyDecision: { evaluatedAt: "2026-01-01T00:00:00.000Z" },
    };
    syncInboxThreadBundleInboxContext(client, "c1", nextContext as never);

    assert.deepEqual(
      client.getQueryData(QUERY_KEYS.conversationInboxContext("c1")),
      nextContext,
    );
    assert.deepEqual(
      client.getQueryData<{ inboxContext: typeof nextContext }>(
        QUERY_KEYS.conversationThread("c1"),
      )?.inboxContext,
      nextContext,
    );
  });

  it("seeding different conversation ids does not cross-contaminate caches", () => {
    const client = new QueryClient();
    seedInboxThreadBundleCache(client, "c1", {
      conversation: { id: "c1", unreadCount: 1, messages: [{ id: "m1" }] },
      inboxContext: {},
    });
    seedInboxThreadBundleCache(client, "c2", {
      conversation: { id: "c2", unreadCount: 5, messages: [{ id: "m2" }] },
      inboxContext: {},
    });

    assert.equal(
      client.getQueryData<{ conversation: { id: string } }>(QUERY_KEYS.conversationThread("c1"))
        ?.conversation.id,
      "c1",
    );
    assert.equal(
      client.getQueryData<{ conversation: { id: string } }>(QUERY_KEYS.conversationThread("c2"))
        ?.conversation.id,
      "c2",
    );
  });
});
