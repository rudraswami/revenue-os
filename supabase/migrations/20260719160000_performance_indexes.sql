-- Speed up handoff queue counts and filters on conversations.metadata->requiresHuman
CREATE INDEX IF NOT EXISTS conversations_metadata_requires_human_gin
ON conversations USING gin (metadata jsonb_path_ops);

-- Speed up inbox search on contact fields
CREATE INDEX IF NOT EXISTS conversations_org_contact_search_idx
ON conversations ("organizationId", lower("contactName"), lower("contactPhone"));
