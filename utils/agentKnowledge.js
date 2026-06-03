import fs from "fs/promises";
import path from "path";
import pg from "pg";
import { loadRagIndex, queryRagIndex, buildRagIndex } from "./ragIndex.js";

const { Pool } = pg;

export const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");
export const LOCAL_INDEX_FILE = path.join(process.cwd(), "data", "rag_index.json");

export const retrievalCollectionsByIntent = {
  run_accessibility_analysis: ["profiles", "variables", "cities"],
  explain_variable: ["variables"],
  ask_data_availability: ["cities", "methodology"],
  explain_result: ["methodology", "variables"],
  compare_profiles: ["profiles", "variables"],
  how_to_use: ["faq", "methodology"],
  troubleshooting: ["faq", "methodology"],
  general_question: ["methodology", "faq", "profiles", "variables", "cities"],
};

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMENSION = Number(process.env.AGENT_EMBEDDING_DIMENSION || 1536);

export function getAgentDatabaseUrl() {
  return process.env.AGENT_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    "";
}

export function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { metadata: {}, content: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { metadata: {}, content: raw };

  const metadata = {};
  const frontmatter = raw.slice(3, end).trim();
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (value.startsWith("[") && value.endsWith("]")) {
      metadata[key] = value.slice(1, -1).split(",").map((item) => item.trim()).filter(Boolean);
    } else if (value === "null") {
      metadata[key] = null;
    } else {
      metadata[key] = value;
    }
  }

  return { metadata, content: raw.slice(end + 4).trim() };
}

export async function listKnowledgeMarkdownFiles(rootDir = KNOWLEDGE_ROOT) {
  const results = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listKnowledgeMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(entryPath);
    }
  }
  return results;
}

function getTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function normalizeMetadata(metadata, filePath) {
  const relativePath = path.relative(KNOWLEDGE_ROOT, filePath).replace(/\\/g, "/");
  const collection = metadata.collection || relativePath.split("/")[0] || "general";
  return {
    ...metadata,
    collection,
    source: metadata.source || relativePath,
    filePath: relativePath,
    city: metadata.city === "null" ? null : metadata.city || null,
    profile: metadata.profile === "null" ? null : metadata.profile || null,
    variable_key: metadata.variable_key === "null" ? null : metadata.variable_key || null,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
  };
}

function chunkVariableFile(content) {
  const lines = content.split(/\r?\n/);
  const chunks = [];
  let intro = [];
  let current = [];
  let currentKey = null;

  for (const line of lines) {
    const match = line.match(/^Variable key:\s*(.+)$/);
    if (match) {
      if (current.length && currentKey) {
        chunks.push({ titleSuffix: currentKey, content: current.join("\n").trim(), variableKey: currentKey });
      }
      currentKey = match[1].trim();
      current = [...intro, line];
      continue;
    }

    if (!currentKey) {
      if (line.trim()) intro.push(line);
    } else {
      current.push(line);
    }
  }

  if (current.length && currentKey) {
    chunks.push({ titleSuffix: currentKey, content: current.join("\n").trim(), variableKey: currentKey });
  }

  return chunks;
}

function chunkMarkdownContent({ content, metadata }) {
  if (metadata.collection === "variables") return chunkVariableFile(content);
  return [{ titleSuffix: null, content, variableKey: metadata.variable_key || null }];
}

export async function buildKnowledgeChunks({ rootDir = KNOWLEDGE_ROOT } = {}) {
  const files = await listKnowledgeMarkdownFiles(rootDir);
  const chunks = [];
  const failed = [];

  for (const filePath of files) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const { metadata: rawMetadata, content } = parseFrontmatter(raw);
      const metadata = normalizeMetadata(rawMetadata, filePath);
      const baseTitle = metadata.title || getTitle(content, path.basename(filePath, ".md"));
      const fileChunks = chunkMarkdownContent({ content, metadata });

      fileChunks.forEach((chunk, index) => {
        const title = chunk.titleSuffix ? `${baseTitle}: ${chunk.titleSuffix}` : baseTitle;
        chunks.push({
          id: `${metadata.source.replace(/\.md$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_")}_${index + 1}`,
          collection: metadata.collection,
          source: metadata.source,
          title,
          content: chunk.content,
          city: metadata.city,
          profile: metadata.profile,
          variable_key: chunk.variableKey || metadata.variable_key,
          tags: metadata.tags,
          metadata: {
            ...metadata,
            title,
            chunkIndex: index + 1,
          },
        });
      });
    } catch (error) {
      failed.push({ filePath, error: error.message });
    }
  }

  return { chunks, failed };
}

export async function embedTexts(texts) {
  if (!process.env.OPENAI_API_KEY) return null;

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  return payload.data.map((item) => item.embedding);
}

export function vectorToSql(value) {
  return `[${value.map((item) => Number(item).toFixed(8)).join(",")}]`;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\p{P}$+<=>^`|~]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);
  const fragments = normalized.split(/\s+/).filter(Boolean);
  return fragments.flatMap((token) => {
    if (/\p{Script=Han}/u.test(token)) return Array.from(token);
    return token.length > 1 ? [token] : [];
  });
}

function toVector(tokens) {
  return tokens.reduce((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});
}

function normalizeVector(vec) {
  const norm = Math.sqrt(Object.values(vec).reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vec;
  return Object.fromEntries(Object.entries(vec).map(([key, value]) => [key, value / norm]));
}

function cosineSimilarity(a = {}, b = {}) {
  const keys = Object.keys(a).length < Object.keys(b).length ? Object.keys(a) : Object.keys(b);
  return keys.reduce((sum, key) => sum + (a[key] || 0) * (b[key] || 0), 0);
}

function clampSimilarity(value) {
  return Math.max(0, Math.min(1, value));
}

function metadataRelevanceBoost({ chunk, city, profile, variable_key }) {
  let boost = 0;
  if (profile && chunk.profile === profile) boost += 0.35;
  if (variable_key && chunk.variable_key === variable_key) boost += 0.35;
  if (city && chunk.city === city) boost += 0.12;
  if (profile && Array.isArray(chunk.tags) && chunk.tags.includes(profile)) boost += 0.08;
  if (variable_key && Array.isArray(chunk.tags) && chunk.tags.includes(variable_key)) boost += 0.08;
  return boost;
}

export async function ensureAgentKnowledgeTable(pool) {
  const sqlPath = path.join(process.cwd(), "db", "agent_knowledge.sql");
  const sql = await fs.readFile(sqlPath, "utf8");
  await pool.query(sql);
}

export async function upsertKnowledgeChunks({ chunks, embeddings, databaseUrl = getAgentDatabaseUrl() }) {
  if (!databaseUrl) return { inserted: 0, skipped: chunks.length, reason: "missing_database_url" };
  if (!embeddings) return { inserted: 0, skipped: chunks.length, reason: "missing_embeddings" };

  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    await ensureAgentKnowledgeTable(pool);
    await pool.query("DELETE FROM agent_knowledge");

    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      await pool.query(
        `INSERT INTO agent_knowledge
          (collection, source, title, content, city, profile, variable_key, tags, embedding, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector, now())`,
        [
          chunk.collection,
          chunk.source,
          chunk.title,
          chunk.content,
          chunk.city,
          chunk.profile,
          chunk.variable_key,
          chunk.tags,
          vectorToSql(embeddings[i]),
        ],
      );
    }

    return { inserted: chunks.length, skipped: 0, reason: null };
  } finally {
    await pool.end();
  }
}

export function summarizeChunks(chunks) {
  const summary = {
    total: chunks.length,
    byCollection: {},
    byCity: {},
    byProfile: {},
    byVariable: {},
  };

  for (const chunk of chunks) {
    summary.byCollection[chunk.collection] = (summary.byCollection[chunk.collection] || 0) + 1;
    if (chunk.city) summary.byCity[chunk.city] = (summary.byCity[chunk.city] || 0) + 1;
    if (chunk.profile) summary.byProfile[chunk.profile] = (summary.byProfile[chunk.profile] || 0) + 1;
    if (chunk.variable_key) summary.byVariable[chunk.variable_key] = (summary.byVariable[chunk.variable_key] || 0) + 1;
  }

  return summary;
}

function mapLocalResult(doc) {
  return {
    title: doc.title || doc.description,
    collection: doc.collection,
    content: doc.content,
    similarity: Number(doc.score || 0),
    metadata: doc.metadata || {},
  };
}

async function loadLocalKnowledgeChunks() {
  const chunkPath = path.join(process.cwd(), "data", "agent_knowledge_chunks.json");
  const raw = await fs.readFile(chunkPath, "utf8");
  const payload = JSON.parse(raw);
  return Array.isArray(payload.chunks) ? payload.chunks : [];
}

function retrieveFromLocalChunks({ chunks, query, city, profile, variable_key, collections, topK }) {
  const allowedCollections = new Set(collections);
  const queryVector = normalizeVector(toVector(tokenize(query)));

  return chunks
    .filter((chunk) => allowedCollections.size === 0 || allowedCollections.has(chunk.collection))
    .filter((chunk) => !city || !chunk.city || chunk.city === city)
    .filter((chunk) => !profile || !chunk.profile || chunk.profile === profile)
    .filter((chunk) => !variable_key || !chunk.variable_key || chunk.variable_key === variable_key)
    .map((chunk) => {
      const vector = normalizeVector(toVector(tokenize(`${chunk.title} ${chunk.content} ${(chunk.tags || []).join(" ")}`)));
      const lexicalSimilarity = cosineSimilarity(queryVector, vector);
      const metadataBoost = metadataRelevanceBoost({ chunk, city, profile, variable_key });
      return {
        title: chunk.title,
        collection: chunk.collection,
        content: chunk.content,
        similarity: clampSimilarity(lexicalSimilarity + metadataBoost),
        metadata: {
          source: chunk.source,
          city: chunk.city,
          profile: chunk.profile,
          variable_key: chunk.variable_key,
          tags: chunk.tags,
          chunkIndex: chunk.metadata?.chunkIndex,
          lexicalSimilarity,
          metadataBoost,
        },
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export async function retrieveFromLocalIndex({ query, city, profile, variable_key, collections, topK }) {
  try {
    const chunks = await loadLocalKnowledgeChunks();
    if (chunks.length) {
      return retrieveFromLocalChunks({ chunks, query, city, profile, variable_key, collections, topK });
    }
  } catch {
    // Fall back to the older local JSON index below.
  }

  let index;
  try {
    index = await loadRagIndex();
  } catch {
    await buildRagIndex();
    index = await loadRagIndex();
  }

  return queryRagIndex({ index, query, city, topK, collections })
    .filter((doc) => !profile || !doc.metadata?.profile || doc.metadata.profile === profile)
    .filter((doc) => !variable_key || !doc.metadata?.variable_key || doc.metadata.variable_key === variable_key)
    .map(mapLocalResult);
}

export async function retrieveFromDatabase({ query, city, profile, variable_key, collections, topK, databaseUrl = getAgentDatabaseUrl() }) {
  if (!databaseUrl || !process.env.OPENAI_API_KEY) return null;

  const [embedding] = await embedTexts([query]);
  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    const params = [vectorToSql(embedding), collections, city || null, profile || null, variable_key || null, topK];
    const result = await pool.query(
      `SELECT
          title,
          collection,
          content,
          city,
          profile,
          variable_key,
          tags,
          source,
          1 - (embedding <=> $1::vector) AS similarity
       FROM agent_knowledge
       WHERE collection = ANY($2::text[])
         AND ($3::text IS NULL OR city IS NULL OR city = $3)
         AND ($4::text IS NULL OR profile IS NULL OR profile = $4)
         AND ($5::text IS NULL OR variable_key IS NULL OR variable_key = $5)
       ORDER BY embedding <=> $1::vector
       LIMIT $6`,
      params,
    );

    return result.rows.map((row) => ({
      title: row.title,
      collection: row.collection,
      content: row.content,
      similarity: Number(row.similarity || 0),
      metadata: {
        city: row.city,
        profile: row.profile,
        variable_key: row.variable_key,
        tags: row.tags,
        source: row.source,
      },
    }));
  } finally {
    await pool.end();
  }
}

export async function retrieveKnowledge({ query, intent = "general_question", city, profile, variable_key, topK = 5 }) {
  const collections = retrievalCollectionsByIntent[intent] || retrievalCollectionsByIntent.general_question;
  const dbResults = await retrieveFromDatabase({ query, city, profile, variable_key, collections, topK }).catch((error) => {
    console.warn("[agentKnowledge] database retrieval failed, falling back to local index:", error.message);
    return null;
  });

  if (dbResults) return { source: "database", collections, results: dbResults };

  const localResults = await retrieveFromLocalIndex({ query, city, profile, variable_key, collections, topK });
  return { source: "local_index", collections, results: localResults };
}
