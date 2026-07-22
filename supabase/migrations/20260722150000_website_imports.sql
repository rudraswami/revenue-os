-- Website Knowledge Import tables
CREATE TABLE IF NOT EXISTS website_imports (
  id               TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'crawling',
  "pagesFound"     INTEGER NOT NULL DEFAULT 0,
  "pagesCrawled"   INTEGER NOT NULL DEFAULT 0,
  "itemsExtracted" INTEGER NOT NULL DEFAULT 0,
  "itemsApproved"  INTEGER NOT NULL DEFAULT 0,
  error            TEXT,
  "crawlMeta"      JSONB NOT NULL DEFAULT '{}',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completedAt"    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_website_imports_org ON website_imports("organizationId");

CREATE TABLE IF NOT EXISTS website_import_items (
  id           TEXT PRIMARY KEY,
  "importId"   TEXT NOT NULL REFERENCES website_imports(id) ON DELETE CASCADE,
  "pageUrl"    TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'general',
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  confidence   DOUBLE PRECISION NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending',
  metadata     JSONB NOT NULL DEFAULT '{}',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_import_items_import ON website_import_items("importId");
CREATE INDEX IF NOT EXISTS idx_website_import_items_import_status ON website_import_items("importId", status);

-- Add importId FK to knowledge_documents
DO $$ BEGIN
  ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS "importId" TEXT REFERENCES website_imports(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_import ON knowledge_documents("importId");
