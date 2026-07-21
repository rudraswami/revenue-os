-- Functional (expression) index that cannot be expressed in schema.prisma.
-- The metadata GIN index is now Prisma-managed (see 0_init / conversations_metadata_idx);
-- only the lower()-expression contact-search index remains raw here. Folded in from
-- supabase/migrations/20260719160000_performance_indexes.sql so fresh environments get
-- it automatically via `prisma migrate deploy`. IF NOT EXISTS keeps it idempotent on
-- databases where it already exists (previously applied via scripts/migrate-performance-indexes.js).

-- Speed up inbox search on contact fields
CREATE INDEX IF NOT EXISTS conversations_org_contact_search_idx
  ON conversations ("organizationId", lower("contactName"), lower("contactPhone"));
