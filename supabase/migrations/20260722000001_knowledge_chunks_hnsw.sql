-- Accelerate org-scoped vector similarity search for knowledge RAG.
-- Safe to run multiple times (IF NOT EXISTS).
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
