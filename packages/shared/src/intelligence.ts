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
}
