import type {
  AiClassificationResult,
  BusinessEmployeeProfile,
  IntelligenceWorkspaceSettings,
  KnowledgeHit,
} from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";
import type { ExecutionRoute } from "./execution-router.service";
import type { PipelineSpans } from "./pipeline-spans";

/** Structured org profile fields extracted from org settings. */
export interface BusinessContext {
  hours?: string | null;
  address?: string | null;
  paymentMethods?: string | null;
  socialLinks?: string | null;
  phone?: string | null;
}

/** Pre-built context passed from classify → compose to avoid duplicate DB/RAG work. */
export interface PipelineContext {
  ctx: ConversationContext;
  knowledgeHits: KnowledgeHit[];
  businessName: string;
  businessProfile: BusinessEmployeeProfile;
  knowledgeGap: boolean;
  executionRoute?: ExecutionRoute;
  spans?: PipelineSpans;
  intelligenceSettings?: IntelligenceWorkspaceSettings;
  hasIndexedChunks?: boolean;
  groundingConfidence?: number;
  /** Structured org-level business context (hours, address, etc.). */
  businessContext?: BusinessContext;
}

export interface DeferredCrmSync {
  organizationId: string;
  conversationId: string;
  leadId?: string;
  result: AiClassificationResult;
  ctx: ConversationContext;
  aiRunId: string;
  updateStage: boolean;
  lockStage: boolean;
  lockHandoff: boolean;
  stageChanged: boolean;
  score: number;
  knowledgeGap: boolean;
  correlationId: string;
  automationPrefs: { stage: boolean; notify: boolean; handoff: boolean };
}
