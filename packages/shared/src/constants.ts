export const QUEUES = {
  WHATSAPP_INBOUND: "whatsapp.inbound",
  AI_CLASSIFY: "ai.classify",
  /** Reserved — customer replies stay in Meta Business Agent; Growvisi does not auto-send WhatsApp. */
  AI_RESPOND: "ai.respond",
  AI_EMBED: "ai.embed",
  NOTIFICATIONS: "notifications.dispatch",
  ANALYTICS: "analytics.aggregate",
} as const;

/** Align digest, Home hot leads, and hot-lead email alerts on one threshold. */
export const HOT_LEAD_SCORE_THRESHOLD = 70;

export const DOMAIN_EVENTS = {
  MESSAGE_RECEIVED: "message.received",
  MESSAGE_SENT: "message.sent",
  MESSAGE_STATUS_UPDATED: "message.status.updated",
  LEAD_STAGE_CHANGED: "lead.stage.changed",
  LEAD_CLASSIFIED: "lead.classified",
  CONVERSATION_ASSIGNED: "conversation.assigned",
  CONVERSATION_AI_HANDOFF: "conversation.ai.handoff",
  CONVERSATION_AI_CORRECTION: "conversation.ai.correction",
  KNOWLEDGE_DOCUMENT_UPDATED: "knowledge.document.updated",
  AUTOMATION_TRIGGERED: "automation.triggered",
} as const;

export const LEAD_STAGE_ORDER = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const DEFAULT_PIPELINE_STAGES = [
  { stage: "NEW", name: "New", order: 0, color: "#6366f1" },
  { stage: "CONTACTED", name: "Contacted", order: 1, color: "#8b5cf6" },
  { stage: "QUALIFIED", name: "Qualified", order: 2, color: "#a855f7" },
  { stage: "PROPOSAL", name: "Proposal", order: 3, color: "#d946ef" },
  { stage: "NEGOTIATION", name: "Negotiation", order: 4, color: "#ec4899" },
  { stage: "WON", name: "Won", order: 5, color: "#22c55e", isWon: true },
  { stage: "LOST", name: "Lost", order: 6, color: "#ef4444", isLost: true },
] as const;
