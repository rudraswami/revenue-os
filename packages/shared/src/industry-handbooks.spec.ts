import {
  CUSTOM_INDUSTRY_ID,
  INDUSTRY_HANDBOOK_IDS,
  getIndustryHandbook,
  isIndustryHandbookId,
  isWorkspaceIndustryId,
  listIndustryHandbooks,
  listIndustryHandbookOptions,
  mergeIndustryHandbookProfile,
  resetHandbookDerivedProfile,
  profileHasHandbookPollution,
  handbookDocumentSourceUrl,
  parseHandbookDocumentSourceUrl,
} from "./industry-handbooks";
import { defaultBusinessEmployeeProfile } from "./intelligence";

describe("industry-handbooks", () => {
  it("lists all industries", () => {
    expect(listIndustryHandbooks().length).toBe(INDUSTRY_HANDBOOK_IDS.length);
    expect(listIndustryHandbookOptions().length).toBe(INDUSTRY_HANDBOOK_IDS.length + 1);
    expect(listIndustryHandbookOptions().some((o) => o.id === CUSTOM_INDUSTRY_ID)).toBe(true);
  });

  it("validates industry id", () => {
    expect(isIndustryHandbookId("clinic")).toBe(true);
    expect(isIndustryHandbookId("unknown")).toBe(false);
    expect(isWorkspaceIndustryId("custom")).toBe(true);
    expect(isWorkspaceIndustryId("unknown")).toBe(false);
  });

  it("merges clinic profile with sensitive ack", () => {
    const profile = mergeIndustryHandbookProfile("City Clinic", "clinic");
    expect(profile.voice.register).toBe("professional");
    expect(profile.acknowledgments.sensitive_topic).toContain("medical");
  });

  it("includes knowledge seeds per industry", () => {
    const handbook = getIndustryHandbook("salon");
    expect(handbook.knowledgeSeeds.length).toBeGreaterThan(0);
    expect(handbook.knowledgeSeeds[0].category).toBeTruthy();
  });

  it("defines compose persona for every industry", () => {
    for (const id of INDUSTRY_HANDBOOK_IDS) {
      const handbook = getIndustryHandbook(id);
      expect(handbook.composePersona.identity).toContain("{businessName}");
      expect(handbook.composePersona.guardrails.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("tags handbook documents with stable sourceUrl", () => {
    expect(handbookDocumentSourceUrl("clinic")).toBe("handbook:clinic");
    expect(parseHandbookDocumentSourceUrl("handbook:salon")).toBe("salon");
    expect(parseHandbookDocumentSourceUrl(null)).toBeNull();
  });

  it("resets handbook-derived profile fields for custom industry", () => {
    const polluted = mergeIndustryHandbookProfile("Acme", "clinic");
    const clean = resetHandbookDerivedProfile("Acme", polluted);
    expect(clean.courtesyTemplates.thanks[0]).not.toContain("doctor");
    expect(clean.escalation.contactName).toBe("our team");
  });

  it("detects handbook pollution on custom workspaces", () => {
    const polluted = mergeIndustryHandbookProfile("Acme", "coaching");
    expect(profileHasHandbookPollution(polluted)).toBe(true);
    expect(profileHasHandbookPollution(defaultBusinessEmployeeProfile("Acme"))).toBe(false);
  });
});
