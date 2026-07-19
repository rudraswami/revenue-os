import type { AiClassificationResult } from "./types";

export const KNOWLEDGE_CATEGORIES = [
  "general",
  "pricing",
  "policy",
  "faq",
  "product",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export const ACTION_TYPES = [
  "lead.update_score",
  "lead.update_stage",
  "conversation.set_handoff",
  "conversation.assign",
  "task.create",
  "email.send",
  "reply.draft",
  "reply.send",
  "webhook.emit",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type ActionStatus = "pending" | "done" | "skipped" | "failed";
export type ActionPlanStatus = "proposed" | "executing" | "completed" | "failed";

export interface KnowledgeHit {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  similarity: number;
  category: string;
  citation: string;
}

export interface ProposedAction {
  type: ActionType;
  executor: "growvisi" | "human" | "automation";
  payload: Record<string, unknown>;
  aiRunId?: string;
}

export interface ActionPlanView {
  id: string;
  status: ActionPlanStatus;
  confidence: number | null;
  classification: AiClassificationResult | null;
  actions: Array<{
    id: string;
    type: string;
    status: string;
    payload: Record<string, unknown>;
    result: Record<string, unknown> | null;
  }>;
  createdAt: string;
}

export interface ConversationIntelligenceView {
  actionPlan: ActionPlanView | null;
  observedMemory: Array<{
    id: string;
    type: string;
    content: string;
    source: string;
    createdAt: string;
  }>;
  knowledgeGaps: string[];
  replyDecision?: ReplyDecision | null;
}

/** Workspace default for how Growvisi handles customer replies. */
export const REPLY_AUTONOMY_MODES = ["intel_only", "assist", "auto_guarded"] as const;
export type ReplyAutonomyMode = (typeof REPLY_AUTONOMY_MODES)[number];

export const REPLY_EXECUTION_MODES = ["skip", "draft", "send"] as const;
export type ReplyExecutionMode = (typeof REPLY_EXECUTION_MODES)[number];

export type ReplyRiskLevel = "low" | "medium" | "high";

/** AI reply pipeline routing — fast template, standard LLM, complex draft, human handoff. */
export type ExecutionPath = "fast" | "standard" | "complex" | "human";

export interface ReplyDecision {
  mode: ReplyExecutionMode;
  /** 0–1 composite confidence for this decision */
  confidence: number;
  risk: ReplyRiskLevel;
  /** Human-readable reasons shown in Inbox */
  reasons: string[];
  /** When mode is skip — primary blocker codes */
  blockers?: string[];
  evaluatedAt: string;
  /** Phase 2: would auto-send if workspace allowed */
  autoEligible?: boolean;
}

/** How aggressively Growvisi may auto-send on WhatsApp (auto_guarded only). */
export const AUTOMATION_POLICY_PRESETS = ["careful", "balanced", "responsive"] as const;
export type AutomationPolicyPreset = (typeof AUTOMATION_POLICY_PRESETS)[number];

export interface AutomationPolicyRules {
  /** Auto-send greetings, thanks, and acks (fast path). */
  autoSendGreetings: boolean;
  /** Auto-send when Business Knowledge match is strong enough. */
  autoSendFaqWhenGrounded: boolean;
  /** Auto-send pricing answers when grounded (false = draft for review). */
  autoSendPricingWhenGrounded: boolean;
  /** Minimum classify confidence to allow auto-send. */
  minClassifyConfidence: number;
  /** Minimum RAG similarity (0–1) to treat as grounded. */
  minGroundingSimilarity: number;
  /** Pipeline stages that always draft instead of auto-send. */
  humanForStages: string[];
}

export interface AutomationSafetySettings {
  /** Max AI sends per thread within the velocity window (loop protection). */
  maxSendsPerVelocityWindow: number;
  /** Velocity window length in minutes. */
  velocityWindowMinutes: number;
}

export interface IntelligenceWorkspaceSettings {
  /** Workspace default for reply behavior. */
  replyAutonomy: ReplyAutonomyMode;
  /** Preset for auto_guarded — careful / balanced / responsive. */
  automationPreset: AutomationPolicyPreset;
  /** Optional overrides; merged on top of preset defaults server-side. */
  automationRules?: Partial<AutomationPolicyRules>;
  safety?: Partial<AutomationSafetySettings>;
}

export const AUTOMATION_PRESET_DEFAULTS: Record<
  AutomationPolicyPreset,
  AutomationPolicyRules
> = {
  careful: {
    autoSendGreetings: true,
    autoSendFaqWhenGrounded: false,
    autoSendPricingWhenGrounded: false,
    minClassifyConfidence: 0.6,
    minGroundingSimilarity: 0.75,
    humanForStages: ["NEGOTIATION", "PROPOSAL", "WON", "LOST"],
  },
  balanced: {
    autoSendGreetings: true,
    autoSendFaqWhenGrounded: true,
    autoSendPricingWhenGrounded: false,
    minClassifyConfidence: 0.55,
    minGroundingSimilarity: 0.7,
    humanForStages: ["NEGOTIATION", "PROPOSAL"],
  },
  responsive: {
    autoSendGreetings: true,
    autoSendFaqWhenGrounded: true,
    autoSendPricingWhenGrounded: true,
    minClassifyConfidence: 0.5,
    minGroundingSimilarity: 0.65,
    humanForStages: ["PROPOSAL"],
  },
};

export const DEFAULT_AUTOMATION_SAFETY: AutomationSafetySettings = {
  maxSendsPerVelocityWindow: 3,
  velocityWindowMinutes: 2,
};

export const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceWorkspaceSettings = {
  replyAutonomy: "assist",
  automationPreset: "balanced",
};
