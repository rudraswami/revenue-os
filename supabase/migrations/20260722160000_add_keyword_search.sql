-- Enable pg_trgm for fuzzy text search on knowledge chunks
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index for fast keyword search on chunk content
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_trgm
  ON knowledge_chunks USING GIN (content gin_trgm_ops);

-- GIN trigram index on document titles for title-based search
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_title_trgm
  ON knowledge_documents USING GIN (title gin_trgm_ops);
