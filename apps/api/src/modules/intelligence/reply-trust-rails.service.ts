import { Injectable } from "@nestjs/common";
import {
  AUTOMATION_PRESET_DEFAULTS,
  validateComposedReplyForSend,
  type AutomationPolicyPreset,
  type ComposedReplyTrustResult,
} from "@growvisi/shared";

export interface PostComposeTrustInput {
  text: string;
  sources: Array<{ similarity?: number }>;
  isFastPath: boolean;
  intentKind?: string;
  automationPreset?: AutomationPolicyPreset;
}

@Injectable()
export class ReplyTrustRailsService {
  validatePostCompose(input: PostComposeTrustInput): ComposedReplyTrustResult {
    const preset = input.automationPreset ?? "balanced";
    const minGroundingSimilarity =
      AUTOMATION_PRESET_DEFAULTS[preset]?.minGroundingSimilarity ?? 0.7;

    return validateComposedReplyForSend({
      text: input.text,
      sources: input.sources,
      isFastPath: input.isFastPath,
      intentKind: input.intentKind,
      minGroundingSimilarity,
    });
  }
}
