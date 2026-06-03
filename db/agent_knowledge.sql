CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agent_knowledge (
  id bigserial PRIMARY KEY,
  collection text NOT NULL,
  source text,
  title text,
  content text NOT NULL,
  city text,
  profile text,
  variable_key text,
  tags text[],
  embedding vector(1536),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_knowledge_collection_idx
  ON agent_knowledge (collection);

CREATE INDEX IF NOT EXISTS agent_knowledge_city_idx
  ON agent_knowledge (city);

CREATE INDEX IF NOT EXISTS agent_knowledge_profile_idx
  ON agent_knowledge (profile);

CREATE INDEX IF NOT EXISTS agent_knowledge_variable_key_idx
  ON agent_knowledge (variable_key);

CREATE INDEX IF NOT EXISTS agent_knowledge_embedding_idx
  ON agent_knowledge
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
