-- Tier 3: agency workspaces, user locale (Hindi UI)
CREATE TYPE "OrganizationKind" AS ENUM ('STANDARD', 'AGENCY');

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "kind" "OrganizationKind" NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS "agency_clients" (
  "id" TEXT NOT NULL,
  "agencyOrganizationId" TEXT NOT NULL,
  "clientOrganizationId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agency_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_clients_clientOrganizationId_key" ON "agency_clients"("clientOrganizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "agency_clients_agencyOrganizationId_clientOrganizationId_key" ON "agency_clients"("agencyOrganizationId", "clientOrganizationId");
CREATE INDEX IF NOT EXISTS "agency_clients_agencyOrganizationId_idx" ON "agency_clients"("agencyOrganizationId");

ALTER TABLE "agency_clients" DROP CONSTRAINT IF EXISTS "agency_clients_agencyOrganizationId_fkey";
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_agencyOrganizationId_fkey" FOREIGN KEY ("agencyOrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_clients" DROP CONSTRAINT IF EXISTS "agency_clients_clientOrganizationId_fkey";
ALTER TABLE "agency_clients" ADD CONSTRAINT "agency_clients_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
