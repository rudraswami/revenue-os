-- Website Knowledge Import tables
CREATE TABLE IF NOT EXISTS website_imports (
  id             TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'crawling',
  pages_found    INTEGER NOT NULL DEFAULT 0,
  pages_crawled  INTEGER NOT NULL DEFAULT 0,
  items_extracted INTEGER NOT NULL DEFAULT 0,
  items_approved INTEGER NOT NULL DEFAULT 0,
  error          TEXT,
  crawl_meta     JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_website_imports_org ON website_imports(organization_id);

CREATE TABLE IF NOT EXISTS website_import_items (
  id         TEXT PRIMARY KEY,
  import_id  TEXT NOT NULL REFERENCES website_imports(id) ON DELETE CASCADE,
  page_url   TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general',
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'pending',
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_import_items_import ON website_import_items(import_id);
CREATE INDEX IF NOT EXISTS idx_website_import_items_import_status ON website_import_items(import_id, status);

-- Add import_id FK to knowledge_documents
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS import_id TEXT REFERENCES website_imports(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_import ON knowledge_documents(import_id);
