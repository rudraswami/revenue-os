import { buildPostActivationCoaching } from "./post-activation-coaching";

describe("buildPostActivationCoaching", () => {
  it("is ineligible before first value", () => {
    const c = buildPostActivationCoaching({
      firstValue: false,
      digestEnabled: false,
      hasTeam: false,
      hasTakeover: false,
    });
    expect(c.eligible).toBe(false);
    expect(c.next).toBeNull();
  });

  it("sequences digest → invite → takeover", () => {
    expect(
      buildPostActivationCoaching({
        firstValue: true,
        digestEnabled: false,
        hasTeam: false,
        hasTakeover: false,
      }).next?.id,
    ).toBe("digest");

    expect(
      buildPostActivationCoaching({
        firstValue: true,
        digestEnabled: true,
        hasTeam: false,
        hasTakeover: false,
      }).next?.id,
    ).toBe("invite");

    expect(
      buildPostActivationCoaching({
        firstValue: true,
        digestEnabled: true,
        hasTeam: true,
        hasTakeover: false,
        handoffsWaiting: 2,
      }).next?.id,
    ).toBe("takeover");
  });

  it("completes when all three habits done", () => {
    const c = buildPostActivationCoaching({
      firstValue: true,
      digestEnabled: true,
      hasTeam: true,
      hasTakeover: true,
    });
    expect(c.allComplete).toBe(true);
    expect(c.next).toBeNull();
    expect(c.completedCount).toBe(3);
  });
});
