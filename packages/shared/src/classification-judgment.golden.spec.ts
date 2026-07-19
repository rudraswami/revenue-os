import { buildJudgmentRagQuery, normalizeClassificationResult } from "./classification-judgment";
import { CLASSIFICATION_GOLDEN_FIXTURES } from "./classification-judgment-golden.fixtures";

describe("classification judgment golden fixtures", () => {
  for (const fixture of CLASSIFICATION_GOLDEN_FIXTURES) {
    it(fixture.name, () => {
      const result = normalizeClassificationResult(fixture.base, fixture.raw);
      const { expect: exp } = fixture;

      if (exp.customerNeedsCount !== undefined) {
        expect(result.customerNeeds?.length ?? 0).toBe(exp.customerNeedsCount);
      }
      if (exp.unansweredCount !== undefined) {
        expect(result.unansweredFromCustomer?.length ?? 0).toBe(exp.unansweredCount);
      }
      if (exp.language !== undefined) {
        expect(result.language).toBe(exp.language);
      } else if ("language" in exp && exp.language === undefined) {
        expect(result.language).toBeUndefined();
      }
      if (exp.dealTemperature !== undefined) {
        expect(result.dealTemperature).toBe(exp.dealTemperature);
      } else if ("dealTemperature" in exp && exp.dealTemperature === undefined) {
        expect(result.dealTemperature).toBeUndefined();
      }
      if (exp.requiresHuman !== undefined) {
        expect(result.requiresHuman).toBe(exp.requiresHuman);
      }
      if (exp.requiresOwner !== undefined) {
        expect(result.requiresOwner).toBe(exp.requiresOwner);
      }
      if (exp.apologyRequired !== undefined) {
        expect(result.apologyRequired).toBe(exp.apologyRequired);
      }
      if (exp.recoveryMode !== undefined) {
        expect(result.recoveryMode).toBe(exp.recoveryMode);
      }
      if (exp.replyBriefIncludes) {
        expect(result.replyBrief ?? "").toContain(exp.replyBriefIncludes);
      }
      if (exp.entityKeys?.length) {
        for (const key of exp.entityKeys) {
          expect(result.entities).toHaveProperty(key);
        }
      }
      if (exp.ragQueryIncludes?.length) {
        const rag = buildJudgmentRagQuery(result);
        for (const fragment of exp.ragQueryIncludes) {
          expect(rag).toContain(fragment);
        }
      }
    });
  }
});
