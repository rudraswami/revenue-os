import { defaultBusinessEmployeeProfile } from "./intelligence";
import {
  CUSTOM_INDUSTRY_ID,
  formatIndustryComposePersonaBlock,
  getDefaultCustomComposePersona,
  inferIndustryIdFromProfile,
  resolveIndustryComposePersona,
} from "./industry-compose-persona";
import { mergeIndustryHandbookProfile } from "./industry-handbooks";

describe("industry-compose-persona", () => {
  describe("resolveIndustryComposePersona", () => {
    it("uses explicit industryId when set", () => {
      const persona = resolveIndustryComposePersona({
        industryId: "clinic",
        businessName: "City Clinic",
        profile: defaultBusinessEmployeeProfile("City Clinic"),
      });
      expect(persona.identity).toContain("City Clinic");
      expect(persona.identity).toContain("receptionist");
      expect(persona.guardrails.some((g) => /medical advice/i.test(g))).toBe(true);
    });

    it("substitutes business name in identity", () => {
      const persona = resolveIndustryComposePersona({
        industryId: "salon",
        businessName: "Glow Spa",
        profile: defaultBusinessEmployeeProfile("Glow Spa"),
      });
      expect(persona.identity).toContain("Glow Spa");
      expect(persona.identity).not.toContain("{businessName}");
    });

    it("falls back to profile inference when industryId is missing", () => {
      const profile = mergeIndustryHandbookProfile("Test Realty", "real_estate");
      const persona = resolveIndustryComposePersona({
        businessName: "Test Realty",
        profile,
      });
      expect(persona.identity).toContain("property advisor");
      expect(persona.guardrails.some((g) => /invent pricing/i.test(g))).toBe(true);
    });

    it("ignores invalid industryId and infers from profile", () => {
      const profile = mergeIndustryHandbookProfile("Tasty Bites", "restaurant");
      const persona = resolveIndustryComposePersona({
        industryId: "not_a_real_industry",
        businessName: "Tasty Bites",
        profile,
      });
      expect(persona.identity).toContain("host");
    });

    it("returns generic persona when no industry signal exists", () => {
      const persona = resolveIndustryComposePersona({
        businessName: "Acme Corp",
        profile: defaultBusinessEmployeeProfile("Acme Corp"),
      });
      expect(persona.identity).toContain("Acme Corp");
      expect(persona.identity).toContain("helpful team member");
      expect(persona.guardrails.length).toBeGreaterThan(0);
    });

    it("uses custom industry defaults with sector label", () => {
      const persona = resolveIndustryComposePersona({
        industryId: CUSTOM_INDUSTRY_ID,
        customIndustryLabel: "E-commerce",
        businessName: "ShopKart",
        profile: defaultBusinessEmployeeProfile("ShopKart"),
      });
      expect(persona.identity).toContain("ShopKart");
      expect(persona.identity).toContain("E-commerce");
    });

    it("profile composePersona override takes priority over handbook", () => {
      const profile = mergeIndustryHandbookProfile("City Clinic", "clinic");
      const persona = resolveIndustryComposePersona({
        industryId: "clinic",
        businessName: "City Clinic",
        profile: {
          ...profile,
          composePersona: {
            identity: "You are the owner of {businessName} — reply personally and warmly.",
            guardrails: ["Always mention our 14-day trial."],
          },
        },
      });
      expect(persona.identity).toContain("owner");
      expect(persona.guardrails).toContain("Always mention our 14-day trial.");
    });

    it("getDefaultCustomComposePersona includes optional sector hint", () => {
      const persona = getDefaultCustomComposePersona("Acme", "Legal services");
      expect(persona.identity).toContain("Legal services");
    });

    it("covers all handbook industries with guardrails", () => {
      const ids = [
        "clinic",
        "salon",
        "coaching",
        "interior_design",
        "restaurant",
        "real_estate",
      ] as const;
      for (const id of ids) {
        const persona = resolveIndustryComposePersona({
          industryId: id,
          businessName: "Test Biz",
          profile: defaultBusinessEmployeeProfile("Test Biz"),
        });
        expect(persona.identity.length).toBeGreaterThan(20);
        expect(persona.guardrails.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("inferIndustryIdFromProfile", () => {
    it("maps clinic reception contact to clinic", () => {
      const profile = mergeIndustryHandbookProfile("X", "clinic");
      expect(inferIndustryIdFromProfile(profile)).toBe("clinic");
    });

    it("returns undefined for generic profiles", () => {
      expect(inferIndustryIdFromProfile(defaultBusinessEmployeeProfile("X"))).toBeUndefined();
    });
  });

  describe("formatIndustryComposePersonaBlock", () => {
    it("includes identity and guardrails section", () => {
      const block = formatIndustryComposePersonaBlock({
        identity: "You are the host at Test Cafe.",
        guardrails: ["Rule one.", "Rule two."],
      });
      expect(block).toContain("You are the host at Test Cafe.");
      expect(block).toContain("## Industry guardrails");
      expect(block).toContain("- Rule one.");
      expect(block).toContain("- Rule two.");
    });

    it("omits guardrails section when empty", () => {
      const block = formatIndustryComposePersonaBlock({
        identity: "You help customers.",
        guardrails: [],
      });
      expect(block).toBe("You help customers.");
    });
  });
});
