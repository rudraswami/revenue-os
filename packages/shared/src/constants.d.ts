export declare const QUEUES: {
    readonly WHATSAPP_INBOUND: "whatsapp.inbound";
    readonly AI_CLASSIFY: "ai.classify";
    readonly AI_RESPOND: "ai.respond";
    readonly AI_EMBED: "ai.embed";
    readonly NOTIFICATIONS: "notifications.dispatch";
    readonly ANALYTICS: "analytics.aggregate";
};
export declare const DOMAIN_EVENTS: {
    readonly MESSAGE_RECEIVED: "message.received";
    readonly MESSAGE_SENT: "message.sent";
    readonly MESSAGE_STATUS_UPDATED: "message.status.updated";
    readonly LEAD_STAGE_CHANGED: "lead.stage.changed";
    readonly CONVERSATION_ASSIGNED: "conversation.assigned";
    readonly CONVERSATION_AI_HANDOFF: "conversation.ai.handoff";
    readonly AUTOMATION_TRIGGERED: "automation.triggered";
};
export declare const DEFAULT_PIPELINE_STAGES: readonly [{
    readonly stage: "NEW";
    readonly name: "New";
    readonly order: 0;
    readonly color: "#6366f1";
}, {
    readonly stage: "CONTACTED";
    readonly name: "Contacted";
    readonly order: 1;
    readonly color: "#8b5cf6";
}, {
    readonly stage: "QUALIFIED";
    readonly name: "Qualified";
    readonly order: 2;
    readonly color: "#a855f7";
}, {
    readonly stage: "PROPOSAL";
    readonly name: "Proposal";
    readonly order: 3;
    readonly color: "#d946ef";
}, {
    readonly stage: "NEGOTIATION";
    readonly name: "Negotiation";
    readonly order: 4;
    readonly color: "#ec4899";
}, {
    readonly stage: "WON";
    readonly name: "Won";
    readonly order: 5;
    readonly color: "#22c55e";
    readonly isWon: true;
}, {
    readonly stage: "LOST";
    readonly name: "Lost";
    readonly order: 6;
    readonly color: "#ef4444";
    readonly isLost: true;
}];
