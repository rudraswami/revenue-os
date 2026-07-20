import {
  assertConversationAssignment,
  assertLeadOwnership,
  assertTaskAssignment,
  canInviteRole,
  hasCapability,
} from "./capabilities";

describe("capabilities", () => {
  it("manager can assign conversations to others", () => {
    expect(() =>
      assertConversationAssignment("MANAGER", "u1", null, "u2"),
    ).not.toThrow();
  });

  it("team cannot assign to others", () => {
    expect(() =>
      assertConversationAssignment("AGENT", "u1", null, "u2"),
    ).toThrow(/cannot assign conversations/);
  });

  it("team can take unassigned conversation", () => {
    expect(() =>
      assertConversationAssignment("AGENT", "u1", null, "u1"),
    ).not.toThrow();
  });

  it("team cannot steal assigned conversation", () => {
    expect(() =>
      assertConversationAssignment("AGENT", "u1", "u2", "u1"),
    ).toThrow(/assigned to someone else/);
  });

  it("team can delegate own task", () => {
    expect(() =>
      assertTaskAssignment("AGENT", "u1", "u1", "u2"),
    ).not.toThrow();
  });

  it("team cannot reassign others task", () => {
    expect(() =>
      assertTaskAssignment("AGENT", "u1", "u2", "u1"),
    ).toThrow(/belongs to someone else/);
  });

  it("manager can invite team only via capability", () => {
    expect(canInviteRole("MANAGER", "AGENT")).toBe(true);
    expect(canInviteRole("MANAGER", "ADMIN")).toBe(false);
    expect(canInviteRole("ADMIN", "ADMIN")).toBe(true);
  });

  it("team can view team analytics", () => {
    expect(hasCapability("AGENT", "analytics.view.team")).toBe(true);
    expect(hasCapability("VIEWER", "analytics.view.team")).toBe(false);
  });

  it("admin has billing capability", () => {
    expect(hasCapability("ADMIN", "billing.manage")).toBe(true);
    expect(hasCapability("MANAGER", "billing.manage")).toBe(false);
  });

  it("team cannot move others deals", () => {
    expect(() => assertLeadOwnership("AGENT", "u1", "u2", "move")).toThrow(
      /only move deals you own/,
    );
  });

  it("team can move own deals", () => {
    expect(() => assertLeadOwnership("AGENT", "u1", "u1", "move")).not.toThrow();
  });
});
