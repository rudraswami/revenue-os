import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowWhatsappConnectBanner } from "./whatsapp-connection-state";

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
