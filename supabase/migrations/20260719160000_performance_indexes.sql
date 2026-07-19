-- Speed up handoff queue counts and filters on conversation.metadata->requiresHuman
CREATE INDEX IF NOT EXISTS "Conversation_metadata_requiresHuman_gin"
ON "Conversation" USING gin (metadata jsonb_path_ops);

-- Speed up inbox search on contact fields (if not already covered)
CREATE INDEX IF NOT EXISTS "Conversation_org_contact_search_idx"
ON "Conversation" ("organizationId", lower("contactName"), lower("contactPhone"));
