import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campaignsUpgradeLabel,
  campaignsUpgradePlanId,
  canUseCampaignsFeatures,
} from "./campaigns-plan-access";

describe("campaigns-plan-access", () => {
  it("allows Team and Operator when subscription is active", () => {
    assert.equal(
      canUseCampaignsFeatures({
        planId: "growth",
        entitlements: { hasAccess: true },
      }),
      true,
    );
    assert.equal(
      canUseCampaignsFeatures({
        planId: "pro",
        entitlements: { hasAccess: true },
      }),
      true,
    );
  });

  it("blocks Solo and trial", () => {
    assert.equal(
      canUseCampaignsFeatures({
        planId: "starter",
        entitlements: { hasAccess: true },
      }),
      false,
    );
    assert.equal(
      canUseCampaignsFeatures({
        planId: "trial",
        entitlements: { hasAccess: true },
      }),
      false,
    );
  });

  it("blocks when entitlements.hasAccess is false", () => {
    assert.equal(
      canUseCampaignsFeatures({
        planId: "pro",
        entitlements: { hasAccess: false },
      }),
      false,
    );
  });

  it("does not use a top-level hasAccess field (billing API nests under entitlements)", () => {
    assert.equal(
      canUseCampaignsFeatures({
        planId: "pro",
        hasAccess: true,
      } as never),
      false,
    );
  });

  it("suggests Team for Solo, Operator for edge cases", () => {
    assert.equal(campaignsUpgradePlanId("starter"), "growth");
    assert.equal(campaignsUpgradePlanId("pro"), "pro");
    assert.match(campaignsUpgradeLabel("growth"), /Team/);
    assert.match(campaignsUpgradeLabel("pro"), /Operator/);
  });
});
