-- Intelligence platform: business events, action plans, learning signals, knowledge categories

ALTER TABLE "knowledge_documents" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general';

CREATE TABLE IF NOT EXISTS "business_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "business_events_organizationId_type_createdAt_idx" ON "business_events"("organizationId", "type", "createdAt");
CREATE INDEX IF NOT EXISTS "business_events_correlationId_idx" ON "business_events"("correlationId");

ALTER TABLE "business_events" ADD CONSTRAINT "business_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "action_plans" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "correlationId" TEXT,
    "triggerEventId" TEXT,
    "conversationId" TEXT,
    "leadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "proposedBy" TEXT NOT NULL DEFAULT 'system',
    "confidence" DOUBLE PRECISION,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "classification" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "action_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "action_plans_organizationId_conversationId_createdAt_idx" ON "action_plans"("organizationId", "conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "action_plans_organizationId_leadId_createdAt_idx" ON "action_plans"("organizationId", "leadId", "createdAt");

ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "actions" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "executor" TEXT NOT NULL DEFAULT 'growvisi',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "aiRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "actions_planId_idx" ON "actions"("planId");
CREATE INDEX IF NOT EXISTS "actions_organizationId_type_createdAt_idx" ON "actions"("organizationId", "type", "createdAt");

ALTER TABLE "actions" ADD CONSTRAINT "actions_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "action_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "learning_signals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "conversationId" TEXT,
    "aiRunId" TEXT,
    "signal" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "learning_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "learning_signals_organizationId_type_createdAt_idx" ON "learning_signals"("organizationId", "type", "createdAt");

ALTER TABLE "learning_signals" ADD CONSTRAINT "learning_signals_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "conversation_memories_conversationId_type_idx" ON "conversation_memories"("conversationId", "type");
