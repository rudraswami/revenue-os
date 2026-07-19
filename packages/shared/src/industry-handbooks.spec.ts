import {
  INDUSTRY_HANDBOOK_IDS,
  getIndustryHandbook,
  isIndustryHandbookId,
  listIndustryHandbooks,
  mergeIndustryHandbookProfile,
} from "./industry-handbooks";

describe("industry-handbooks", () => {
  it("lists all industries", () => {
    expect(listIndustryHandbooks().length).toBe(INDUSTRY_HANDBOOK_IDS.length);
  });

  it("validates industry id", () => {
    expect(isIndustryHandbookId("clinic")).toBe(true);
    expect(isIndustryHandbookId("unknown")).toBe(false);
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
});
