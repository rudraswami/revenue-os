import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";
import { seedDashboardShellCache, type ShellBootstrapResponse } from "@/lib/shell-bootstrap";
import {
  clearSessionQueryCache,
  invalidateWorkspaceShellCache,
} from "@/lib/session-query-cache";

const minimalBootstrap: ShellBootstrapResponse = {
  me: {
    user: {
      id: "u1",
      email: "a@test.com",
      name: "A",
      emailVerified: "2024-01-01",
    },
    organization: { id: "o1", name: "Org", slug: "org" },
    role: "OWNER",
    onboarding: { whatsappConnected: false, firstMessageReceived: false, complete: false },
    workspaces: [],
  },
  billing: {
    entitlements: { trialExpired: false, trialEndsAt: null, hasAccess: true, planId: "growth" },
  },
  agency: { kind: "none", isAgency: false, canEnableAgency: false, clientCount: 0, clientLimit: 0 },
  whatsapp: { accounts: [{ isActive: false }] },
  onboardingProgress: {
    whatsappConnected: false,
    firstInbound: false,
    aiClassified: false,
    pipelineMoved: false,
  },
  capabilities: { aiClassification: true },
};

describe("session-query-cache", () => {
  it("clearSessionQueryCache removes all cached queries", () => {
    const client = new QueryClient();
    seedDashboardShellCache(client, minimalBootstrap);
    assert.ok(client.getQueryData(QUERY_KEYS.billing));
    clearSessionQueryCache(client);
    assert.equal(client.getQueryData(QUERY_KEYS.billing), undefined);
  });

  it("invalidateWorkspaceShellCache marks seeded shell keys stale", () => {
    const client = new QueryClient();
    seedDashboardShellCache(client, minimalBootstrap);
    assert.equal(client.getQueryState(QUERY_KEYS.billing)?.isInvalidated, false);
    invalidateWorkspaceShellCache(client);
    for (const key of [
      QUERY_KEYS.billing,
      QUERY_KEYS.whatsappAccounts,
      QUERY_KEYS.onboardingProgress,
      QUERY_KEYS.agencyStatus,
      QUERY_KEYS.conversationCapabilities,
      QUERY_KEYS.authMe,
    ] as const) {
      assert.equal(client.getQueryState(key)?.isInvalidated, true, String(key));
    }
  });
});

describe("seedDashboardShellCache", () => {
  it("seeds all primary shell-owned query keys", () => {
    const client = new QueryClient();
    seedDashboardShellCache(client, minimalBootstrap);
    assert.deepEqual(client.getQueryData(QUERY_KEYS.billing), minimalBootstrap.billing);
    assert.deepEqual(client.getQueryData(QUERY_KEYS.whatsappAccounts), minimalBootstrap.whatsapp.accounts);
    assert.deepEqual(
      client.getQueryData(QUERY_KEYS.onboardingProgress),
      minimalBootstrap.onboardingProgress,
    );
  });
});
