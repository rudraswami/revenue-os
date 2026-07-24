import { describe, expect, it } from "vitest";
import {
  displayTemplateName,
  formatTemplateRejectionReason,
  insertTemplateVariable,
} from "./template-utils";

describe("formatTemplateRejectionReason", () => {
  it("returns null for NONE and empty values", () => {
    expect(formatTemplateRejectionReason(undefined)).toBeNull();
    expect(formatTemplateRejectionReason("NONE")).toBeNull();
    expect(formatTemplateRejectionReason("none")).toBeNull();
    expect(formatTemplateRejectionReason("")).toBeNull();
  });

  it("returns trimmed reason when meaningful", () => {
    expect(formatTemplateRejectionReason("  Invalid variable  ")).toBe("Invalid variable");
  });
});

describe("displayTemplateName", () => {
  it("replaces underscores with spaces", () => {
    expect(displayTemplateName("growvisi_campaign_announcement")).toBe(
      "growvisi campaign announcement",
    );
  });
});

describe("insertTemplateVariable", () => {
  it("appends variable token", () => {
    expect(insertTemplateVariable("Hi", 1)).toBe("Hi {{1}}");
  });
});
