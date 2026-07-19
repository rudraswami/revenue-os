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

export interface IntelligenceWorkspaceSettings {
  /** Default for new threads — per-thread aiEnabled still overrides assist vs human */
  replyAutonomy: ReplyAutonomyMode;
}

export const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceWorkspaceSettings = {
  replyAutonomy: "assist",
};
