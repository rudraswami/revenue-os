import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activationProgress,
  canSeeSetupAction,
  computeAgencySetupActions,
  computeSetupActions,
} from "./setup-actions";

const baseProgress = {
  whatsappConnected: true,
  firstInbound: true,
  aiClassified: true,
  pipelineMoved: true,
};

describe("computeSetupActions", () => {
  it("returns connect step when WhatsApp is not connected", () => {
    const result = computeSetupActions({
      billing: null,
      progress: { ...baseProgress, whatsappConnected: false },
      accounts: [],
      health: null,
      capabilities: { aiClassification: true },
      actor: { role: "OWNER" },
    });
    assert.ok(result.actions.some((a) => a.id === "connect-whatsapp"));
  });

  it("hides billing actions from agents", () => {
    const result = computeSetupActions({
      billing: {
        entitlements: {
          trialExpired: true,
          trialEndsAt: null,
          hasAccess: false,
          planId: "trial",
        },
      },
      progress: baseProgress,
      accounts: [{ isActive: true }],
      health: null,
      capabilities: { aiClassification: true },
      actor: { role: "AGENT" },
    });
    assert.equal(result.actions.some((a) => a.id === "trial-ended"), false);
  });

  it("shows webhook delivery when connected but webhooks not confirmed", () => {
    const result = computeSetupActions({
      billing: null,
      progress: {
        whatsappConnected: true,
        firstInbound: false,
        aiClassified: false,
        pipelineMoved: false,
      },
      accounts: [{ isActive: true }],
      health: {
        checks: [
          { id: "account", ok: true },
          { id: "meta_webhooks", ok: false },
          { id: "webhook_url", ok: false },
        ],
        stats: { inboundCount: 0 },
      },
      capabilities: { aiClassification: true },
      actor: { role: "OWNER" },
    });
    assert.ok(result.actions.some((a) => a.id === "webhook-delivery"));
  });

  it("tracks activation progress", () => {
    const progress = activationProgress({
      whatsappConnected: true,
      firstInbound: true,
      aiClassified: false,
      pipelineMoved: false,
    });
    assert.deepEqual(progress, { completed: 2, total: 4, inActivation: true });
  });
});

describe("canSeeSetupAction", () => {
  it("allows agents to see inbox activation steps", () => {
    assert.equal(canSeeSetupAction("first-inbound", { role: "AGENT" }), true);
    assert.equal(canSeeSetupAction("ai-classify", { role: "AGENT" }), true);
  });

  it("blocks connect for agents without whatsapp.connect", () => {
    assert.equal(canSeeSetupAction("connect-whatsapp", { role: "AGENT" }), false);
  });
});

describe("computeAgencySetupActions", () => {
  it("suggests adding first client when portfolio is empty", () => {
    const result = computeAgencySetupActions({
      total: 0,
      live: 0,
      setup: 0,
      token: 0,
      disconnected: 0,
      handoffs: 0,
      unreadMessages: 0,
    });
    assert.equal(result.actions[0]?.id, "agency-add-client");
  });

  it("prioritizes disconnected clients", () => {
    const result = computeAgencySetupActions({
      total: 3,
      live: 1,
      setup: 1,
      token: 0,
      disconnected: 1,
      handoffs: 0,
      unreadMessages: 0,
    });
    assert.equal(result.actions[0]?.id, "agency-connect");
    assert.equal(result.criticalCount, 1);
  });

  it("ignores setup progress and handoffs for FAB", () => {
    const result = computeAgencySetupActions({
      total: 5,
      live: 3,
      setup: 2,
      token: 0,
      disconnected: 0,
      handoffs: 4,
      unreadMessages: 10,
    });
    assert.equal(result.actions.length, 0);
    assert.equal(result.allComplete, true);
  });
});
