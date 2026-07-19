import {
  defaultBusinessEmployeeProfile,
  normalizeBusinessEmployeeProfile,
  resolveBusinessEmployeeProfile,
} from "./intelligence";

describe("BusinessEmployeeProfile", () => {
  it("builds defaults from business name", () => {
    const profile = defaultBusinessEmployeeProfile("Acme Interiors");
    expect(profile.greetingVariants.firstContact[0]).toContain("Acme Interiors");
    expect(profile.voice.signOff).toContain("Acme Interiors");
    expect(profile.discountAuthority.mode).toBe("none");
  });

  it("merges partial overrides", () => {
    const profile = normalizeBusinessEmployeeProfile(
      {
        voice: { register: "professional", useFirstName: false, emoji: "none" },
        closeActions: { paymentLink: "https://rzp.io/test" },
      },
      "Demo Co",
    );
    expect(profile.voice.register).toBe("professional");
    expect(profile.voice.useFirstName).toBe(false);
    expect(profile.closeActions.paymentLink).toBe("https://rzp.io/test");
    expect(profile.greetingVariants.firstContact.length).toBeGreaterThan(0);
  });

  it("caps acknowledgment map size and trims strings", () => {
    const profile = normalizeBusinessEmployeeProfile(
      {
        acknowledgments: {
          custom_code: "  Hello  ",
        },
      },
      "Biz",
    );
    expect(profile.acknowledgments.custom_code).toBe("Hello");
    expect(profile.acknowledgments.sensitive_topic).toBeDefined();
  });

  it("resolveBusinessEmployeeProfile matches normalize on empty", () => {
    const a = resolveBusinessEmployeeProfile(undefined, "Shop");
    const b = normalizeBusinessEmployeeProfile({}, "Shop");
    expect(a).toEqual(b);
  });
});
