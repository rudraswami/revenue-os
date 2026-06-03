import type { LeadStage } from "./types";
export interface MessageReceivedEvent {
    organizationId: string;
    conversationId: string;
    messageId: string;
    waMessageId: string;
    contactPhone: string;
}
export interface LeadStageChangedEvent {
    organizationId: string;
    leadId: string;
    fromStage: LeadStage | null;
    toStage: LeadStage;
    confidence?: number;
    aiRunId?: string;
}
export interface ConversationAiHandoffEvent {
    organizationId: string;
    conversationId: string;
    reason: string;
}
