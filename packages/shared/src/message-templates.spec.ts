import {
  countTemplateVariables,
  canDeleteTemplate,
  canEditTemplateBody,
  canEditTemplateCategory,
  buildTemplateBodyExample,
  MESSAGE_TEMPLATE_STARTERS,
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

  it("builds Meta body_text examples for sequential variables", () => {
    const example = buildTemplateBodyExample(
      "Hi {{1}}, your appointment with {{2}} is on {{3}}.",
      ["Rahul", "Acme Clinic", "Monday 10 AM"],
    );
    expect(example).toEqual({
      body_text: [["Rahul", "Acme Clinic", "Monday 10 AM"]],
    });
    expect(buildTemplateBodyExample("No variables here")).toBeUndefined();
  });

  it("builds examples for every curated starter (Meta requires body_text)", () => {
    for (const starter of MESSAGE_TEMPLATE_STARTERS) {
      const validation = validateTemplateBody(starter.body);
      expect(validation.ok).toBe(true);

      const example = buildTemplateBodyExample(starter.body, starter.variableHints);
      expect(example).toBeDefined();

      const varCount = countTemplateVariables(starter.body);
      expect(example!.body_text[0]).toHaveLength(varCount);
      expect(example!.body_text[0].every((v) => v.trim().length > 0)).toBe(true);
    }
  });

  it("builds default examples for custom templates without hints", () => {
    const body = "Hello {{1}}, your order {{2}} ships tomorrow.";
    const example = buildTemplateBodyExample(body);
    expect(example).toEqual({
      body_text: [["Rahul", "Acme Clinic"]],
    });
  });
});
