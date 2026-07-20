-- P1 pipeline: per-stage pagination with orderBy updatedAt
CREATE INDEX IF NOT EXISTS leads_org_stage_updated_at_idx
ON leads ("organizationId", stage, "updatedAt" DESC);

-- P1 pipeline: mine / unassigned filters scoped by stage
CREATE INDEX IF NOT EXISTS leads_org_owner_stage_idx
ON leads ("organizationId", "ownerId", stage);

-- P1 pipeline: hot score filter
CREATE INDEX IF NOT EXISTS leads_org_score_idx
ON leads ("organizationId", score DESC);
