import {
  CUSTOM_INDUSTRY_ID,
  INDUSTRY_HANDBOOK_IDS,
  getIndustryHandbook,
  isIndustryHandbookId,
  isWorkspaceIndustryId,
  listIndustryHandbooks,
  listIndustryHandbookOptions,
  mergeIndustryHandbookProfile,
} from "./industry-handbooks";

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
});
