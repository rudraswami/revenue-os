import {
  countTemplateVariables,
  canDeleteTemplate,
  canEditTemplateBody,
  canEditTemplateCategory,
  resolveAutoProvisionStarterId,
  sanitizeTemplateName,
  templateEditActionLabel,
  validateTemplateBody,
  validateTemplateName,
} from "./message-templates";

describe("message-templates", () => {
  it("sanitizes template names for Meta", () => {
    expect(sanitizeTemplateName("Follow-up Offer!")).toBe("follow_up_offer");
    expect(sanitizeTemplateName("  growvisi_followup_v1  ")).toBe("growvisi_followup_v1");
  });

  it("rejects empty names after sanitize", () => {
    expect(validateTemplateName("___").ok).toBe(false);
  });

  it("picks Hindi starter for hi locale", () => {
    expect(resolveAutoProvisionStarterId("hi")).toBe("followup_hi");
    expect(resolveAutoProvisionStarterId("en")).toBe("followup_inquiry");
  });

  it("counts sequential variables", () => {
    expect(countTemplateVariables("Hi {{1}}, welcome to {{2}}")).toBe(2);
    expect(countTemplateVariables("No vars here")).toBe(0);
  });

  it("validates body length and variables", () => {
    const ok = validateTemplateBody("Hello {{1}}, thanks for contacting {{2}} today.");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.variableCount).toBe(2);

    const bad = validateTemplateBody("Hi {{2}} only");
    expect(bad.ok).toBe(false);
  });

  it("exposes template lifecycle rules aligned with Meta", () => {
    expect(canEditTemplateBody("REJECTED")).toBe(true);
    expect(canEditTemplateBody("APPROVED")).toBe(true);
    expect(canEditTemplateBody("PENDING")).toBe(false);
    expect(canEditTemplateCategory("REJECTED")).toBe(true);
    expect(canEditTemplateCategory("APPROVED")).toBe(false);
    expect(canDeleteTemplate("APPROVED")).toBe(true);
    expect(canDeleteTemplate("PENDING_DELETION")).toBe(false);
    expect(templateEditActionLabel("REJECTED")).toBe("Edit & resubmit");
  });
});
