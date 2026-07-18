import type { LeadStage } from "./types";

export interface MessageReceivedEvent {
  organizationId: string;
  conversationId: string;
  messageId: string;
  waMessageId: string;
  contactPhone: string;
  leadId?: string;
  correlationId?: string;
}

export interface MessageSentEvent {
  organizationId: string;
  conversationId: string;
  messageId: string;
  leadId?: string;
  content?: string;
  correlationId?: string;
}

export interface LeadStageChangedEvent {
  organizationId: string;
  leadId: string;
  fromStage: LeadStage | null;
  toStage: LeadStage;
  confidence?: number;
  aiRunId?: string;
  correlationId?: string;
}

export interface LeadClassifiedEvent {
  organizationId: string;
  conversationId: string;
  leadId: string;
  messageId: string;
  aiRunId: string;
  classification: Record<string, unknown>;
  correlationId?: string;
}

export interface ConversationAiHandoffEvent {
  organizationId: string;
  conversationId: string;
  leadId: string;
  reason: string;
  handoffType?: "complex" | "knowledge_gap" | "human_request";
  correlationId?: string;
}

export interface ConversationAiCorrectionEvent {
  organizationId: string;
  conversationId: string;
  leadId: string;
  correctionId: string;
  correlationId?: string;
}

export interface KnowledgeDocumentUpdatedEvent {
  organizationId: string;
  documentId: string;
  correlationId?: string;
}
