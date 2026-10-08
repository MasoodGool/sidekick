CREATE EXTENSION IF NOT EXISTS vector;

-- One row per source file.
CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  business_id TEXT NOT NULL,
  source      TEXT NOT NULL,          -- e.g. "prices.md"
  title       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, source)
);

-- One row per chunk: vector for semantic search, tsvector for keyword search.
-- __EMBEDDING_DIM__ is replaced with EMBEDDING_DIM by src/scripts/apply-schema.ts.
CREATE TABLE IF NOT EXISTS chunks (
  id          SERIAL PRIMARY KEY,
  document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(__EMBEDDING_DIM__) NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_tsv_gin ON chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_business ON chunks (business_id);

-- Our own trace log: latency, tokens and cost per request (Langfuse mirrors this on Sunday).
CREATE TABLE IF NOT EXISTS traces (
  id                 SERIAL PRIMARY KEY,
  created_at         TIMESTAMPTZ DEFAULT now(),
  business_id        TEXT,
  question           TEXT,
  retrieved_ids      INT[],
  answer             TEXT,
  refused            BOOLEAN,
  model              TEXT,
  input_tokens       INT,
  output_tokens      INT,
  cache_read_tokens  INT,
  cache_write_tokens INT,
  cost_usd           NUMERIC(12,6),
  retrieval_ms       INT,
  generation_ms      INT,
  total_ms           INT
);
