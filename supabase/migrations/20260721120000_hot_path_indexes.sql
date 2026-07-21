-- Per-conversation AI history lookups (inbox intelligence, thread bundle).
CREATE INDEX IF NOT EXISTS ai_runs_conversation_id_idx
ON ai_runs ("conversationId");

-- Lead-scoped automation history (contact timeline, stale-deal dedupe).
CREATE INDEX IF NOT EXISTS automation_logs_lead_id_idx
ON automation_logs ("leadId");
