-- Schema drift catch-up: CRM tables, campaigns, tracking, auth columns, SLA fields
-- Mirrors packages/database/prisma/schema.prisma additions after Jan 2026 baseline

-- Enums
DO $$ BEGIN
  CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auth: refresh token org scope
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
CREATE INDEX IF NOT EXISTS "refresh_tokens_organizationId_idx" ON "refresh_tokens"("organizationId");
DO $$ BEGIN
  ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Conversations SLA
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "firstResponseAt" TIMESTAMP(3);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "slaBreached" BOOLEAN NOT NULL DEFAULT false;

-- Leads owner
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
CREATE INDEX IF NOT EXISTS "leads_ownerId_idx" ON "leads"("ownerId");

-- Tags
CREATE TABLE IF NOT EXISTS "tags" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#006c49',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tags_organizationId_name_key" ON "tags"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "tags_organizationId_idx" ON "tags"("organizationId");
DO $$ BEGIN
  ALTER TABLE "tags" ADD CONSTRAINT "tags_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "lead_tags" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lead_tags_leadId_tagId_key" ON "lead_tags"("leadId", "tagId");
CREATE INDEX IF NOT EXISTS "lead_tags_tagId_idx" ON "lead_tags"("tagId");
DO $$ BEGIN
  ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Lead notes
CREATE TABLE IF NOT EXISTS "lead_notes" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lead_notes_leadId_createdAt_idx" ON "lead_notes"("leadId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tasks
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "leadId" TEXT,
  "assignedToId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "tasks_organizationId_status_dueAt_idx" ON "tasks"("organizationId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "tasks_assignedToId_status_idx" ON "tasks"("assignedToId", "status");
CREATE INDEX IF NOT EXISTS "tasks_leadId_idx" ON "tasks"("leadId");
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Automation logs
CREATE TABLE IF NOT EXISTS "automation_logs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "automationType" TEXT NOT NULL,
  "trigger" TEXT NOT NULL DEFAULT '',
  "result" TEXT NOT NULL,
  "leadId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "automation_logs_organizationId_createdAt_idx" ON "automation_logs"("organizationId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Campaigns
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "templateName" TEXT,
  "messageBody" TEXT,
  "audienceFilter" JSONB NOT NULL DEFAULT '{}',
  "totalRecipients" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "campaigns_organizationId_status_idx" ON "campaigns"("organizationId", "status");
DO $$ BEGIN
  ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "campaign_recipients" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "leadId" TEXT,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "campaign_recipients_campaignId_status_idx" ON "campaign_recipients"("campaignId", "status");
DO $$ BEGIN
  ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tracking links (globally unique slug for public redirects)
CREATE TABLE IF NOT EXISTS "tracking_links" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "prefilledText" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmContent" TEXT,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tracking_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tracking_links_slug_key" ON "tracking_links"("slug");
CREATE INDEX IF NOT EXISTS "tracking_links_organizationId_idx" ON "tracking_links"("organizationId");
DO $$ BEGIN
  ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop org-scoped slug index if migrating from older unique constraint
DROP INDEX IF EXISTS "tracking_links_organizationId_slug_key";
