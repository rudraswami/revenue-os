import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowWhatsappConnectBanner, resolveWhatsappConnectionState } from "./whatsapp-connection-state";

describe("shouldShowWhatsappConnectBanner", () => {
  it("hides when no token", () => {
    assert.equal(
      shouldShowWhatsappConnectBanner({
        hasToken: false,
        isAgency: false,
        accounts: undefined,
        persistedWhatsappConnected: false,
      }),
      false,
    );
  });

  it("hides for agency workspaces", () => {
    assert.equal(
      shouldShowWhatsappConnectBanner({
        hasToken: true,
        isAgency: true,
        accounts: [],
        persistedWhatsappConnected: false,
      }),
      false,
    );
  });

  it("hides while loading when session says WhatsApp is connected", () => {
    assert.equal(
      shouldShowWhatsappConnectBanner({
        hasToken: true,
        isAgency: false,
        accounts: undefined,
        persistedWhatsappConnected: true,
      }),
      false,
    );
  });

  it("hides while loading when connection state is unknown", () => {
    assert.equal(
      shouldShowWhatsappConnectBanner({
        hasToken: true,
        isAgency: false,
        accounts: undefined,
        persistedWhatsappConnected: undefined,
      }),
      false,
    );
  });

  it("shows when API confirms no active account", () => {
    assert.equal(
      shouldShowWhatsappConnectBanner({
        hasToken: true,
        isAgency: false,
        accounts: [{ isActive: false }],
        persistedWhatsappConnected: true,
      }),
      true,
    );
  });

  it("hides when API confirms active account", () => {
    assert.equal(
      shouldShowWhatsappConnectBanner({
        hasToken: true,
        isAgency: false,
        accounts: [{ isActive: true }],
        persistedWhatsappConnected: false,
      }),
      false,
    );
  });
});

describe("resolveWhatsappConnectionState", () => {
  it("connected when conversations exist", () => {
    assert.equal(
      resolveWhatsappConnectionState({
        accounts: undefined,
        persistedWhatsappConnected: false,
        hasConversations: true,
      }),
      "connected",
    );
  });

  it("unknown while accounts loading without session hint", () => {
    assert.equal(
      resolveWhatsappConnectionState({
        accounts: undefined,
        persistedWhatsappConnected: undefined,
      }),
      "unknown",
    );
  });

  it("connected from persisted onboarding when accounts not loaded", () => {
    assert.equal(
      resolveWhatsappConnectionState({
        accounts: undefined,
        persistedWhatsappConnected: true,
      }),
      "connected",
    );
  });

  it("disconnected only when API confirms no active account", () => {
    assert.equal(
      resolveWhatsappConnectionState({
        accounts: [{ isActive: false }],
        persistedWhatsappConnected: true,
      }),
      "disconnected",
    );
  });
});
