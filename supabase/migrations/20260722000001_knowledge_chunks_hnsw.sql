-- Accelerate org-scoped vector similarity search for knowledge RAG.
-- Cosine ops on HNSW require pgvector >= 0.7; older Supabase projects only support
-- vector_cosine_ops on IVFFlat. Try HNSW first, fall back to IVFFlat.
DO $$
BEGIN
  BEGIN
    EXECUTE $sql$
      CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
        ON knowledge_chunks
        USING hnsw (embedding extensions.vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    $sql$;
  EXCEPTION
    WHEN undefined_object THEN
      EXECUTE $sql$
        CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_ivfflat_idx
          ON knowledge_chunks
          USING ivfflat (embedding extensions.vector_cosine_ops)
          WITH (lists = 100)
      $sql$;
  END;
END $$;
