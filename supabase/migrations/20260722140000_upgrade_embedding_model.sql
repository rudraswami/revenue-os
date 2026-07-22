-- Upgrade knowledge_chunks embedding from text-embedding-3-small (1536d)
-- to text-embedding-3-large (3072d). Existing embeddings are invalidated and
-- must be re-embedded after this migration.

-- 1. Drop existing HNSW (or IVFFlat fallback) index
DO $$ BEGIN
  DROP INDEX IF EXISTS knowledge_chunks_embedding_hnsw_idx;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP INDEX IF EXISTS knowledge_chunks_embedding_ivfflat_idx;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 2. Alter embedding column from vector(1536) to vector(3072)
DO $$ BEGIN
  ALTER TABLE knowledge_chunks
    ALTER COLUMN embedding TYPE extensions.vector(3072);
EXCEPTION WHEN others THEN
  RAISE WARNING 'Could not alter embedding column: %', SQLERRM;
END $$;

-- 3. Recreate HNSW index with the new dimension
DO $$ BEGIN
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
