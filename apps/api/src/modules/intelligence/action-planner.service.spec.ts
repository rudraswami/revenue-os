import { ActionPlannerService } from "./action-planner.service";
import { ReplyPolicyService } from "./reply-policy.service";
import { AutomationPolicyService } from "./automation-policy.service";
import type { ClassificationPlanInput } from "./action-planner.service";
import type { ConversationContext } from "./context-builder.service";
import { DEFAULT_INTELLIGENCE_SETTINGS, buildWorkingMemory } from "@growvisi/shared";

function basePlanInput(
  overrides: Partial<ClassificationPlanInput> = {},
): ClassificationPlanInput {
  const lead = {
      id: "lead_1",
      stage: "NEW" as const,
      score: 20,
      displayName: "Test",
      phone: "+919999999999",
      profile: {},
      aiEnabled: true,
    };
  const messages: ConversationContext["messages"] = [];
  const observedMemory: ConversationContext["observedMemory"] = [];
  const ctx = {
    organizationId: "org_1",
    conversationId: "conv_1",
    leadId: "lead_1",
    lead,
    conversation: {
      id: "conv_1",
      aiEnabled: true,
      metadata: {},
      contactName: "Test",
      lastInboundAt: new Date(),
    },
    messages,
    transcript: "",
    lastInbound: "What is the price?",
    ragQuery: "What is the price?",
    observedMemory,
    workingMemory: buildWorkingMemory({
      lead,
      conversation: { contactName: "Test" },
      messages,
      observedMemory,
    }),
  } as ConversationContext;

  return {
    ctx,
    result: {
      stage: "QUALIFIED",
      confidence: 0.85,
      intent: "Pricing inquiry",
      sentiment: "neutral",
      suggestedActions: [],
      requiresHuman: false,
    },
    knowledgeHits: [],
    aiRunId: "run_1",
    autoStageEnabled: true,
    lockStage: false,
    lockHandoff: false,
    stageChanged: false,
    score: 85,
    workspaceAutonomy: "assist",
    intelligenceSettings: DEFAULT_INTELLIGENCE_SETTINGS,
    withinReplyWindow: true,
    autoSendPlanOk: true,
    executionPath: "standard",
    automationPrefs: { stage: true, notify: false, handoff: false },
    ...overrides,
  };
}

describe("ActionPlannerService", () => {
  const planner = new ActionPlannerService(
    new ReplyPolicyService({} as never, new AutomationPolicyService()),
  );

  it("emits stage webhook when stageChanged is true", () => {
    const { actions } = planner.buildFromClassification(
      basePlanInput({ stageChanged: true }),
    );
    const webhook = actions.find((a) => a.type === "webhook.emit");
    expect(webhook).toBeDefined();
    expect(webhook?.payload).toMatchObject({
      event: "lead.stage.changed",
      fromStage: "NEW",
      toStage: "QUALIFIED",
    });
  });

  it("skips stage webhook when stageChanged is false", () => {
    const { actions } = planner.buildFromClassification(
      basePlanInput({ stageChanged: false }),
    );
    expect(actions.some((a) => a.type === "webhook.emit")).toBe(false);
  });

  it("detects knowledge gap for pricing with no hits", () => {
    expect(
      planner.detectKnowledgeGap(basePlanInput().ctx, [], {
        intentKind: "pricing",
      }),
    ).toBe(true);
  });

  it("detects policy gap for complaints", () => {
    const ctx = {
      ...basePlanInput().ctx,
      lastInbound: "I want a refund",
      ragQuery: "I want a refund",
    };
    expect(
      planner.detectKnowledgeGap(ctx, [], {
        intentKind: "complaint",
        hasIndexedChunks: true,
      }),
    ).toBe(true);
  });
});
