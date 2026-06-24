import fs from "fs/promises";
import path from "path";
import pg from "pg";
import { loadRagIndex, queryRagIndex, buildRagIndex } from "./ragIndex.js";
import { callBigModelEmbeddings } from "./bigModelClient.js";

const { Pool } = pg;

export const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");
export const LOCAL_INDEX_FILE = path.join(process.cwd(), "data", "rag_index.json");
export const LOCAL_CHUNKS_FILE = path.join(process.cwd(), "data", "agent_knowledge_chunks.json");
export const LOCAL_EMBEDDINGS_FILE = path.join(process.cwd(), "data", "agent_knowledge_embeddings.json");

export const retrievalCollectionsByIntent = {
  catchment_area_analysis: ["profiles", "variables", "cities", "methodology"],
  area_suitability_question: ["profiles", "variables", "cities", "methodology"],
  route_recommendation: ["methodology", "faq", "profiles", "variables"],
  specific_poi_query: ["faq", "methodology"],
  parameter_recommendation: ["profiles", "variables", "methodology"],
  run_accessibility_analysis: ["profiles", "variables", "cities"],
  explain_variable: ["variables"],
  ask_data_availability: ["cities", "methodology"],
  explain_result: ["methodology", "variables"],
  compare_with_previous_result: ["methodology", "variables", "profiles"],
  compare_current_with_previous: ["methodology", "variables", "profiles"],
  compare_two_locations: ["methodology", "variables", "profiles"],
  follow_up_question: ["methodology", "faq"],
  compare_profiles: ["profiles", "variables"],
  how_to_use: ["faq", "methodology"],
  troubleshooting: ["faq", "methodology"],
  unsupported_specific_poi_query: ["faq", "methodology"],
  unsupported_related_question: ["cities", "variables", "methodology", "faq"],
  general_question: ["methodology", "faq", "profiles", "variables", "cities"],
};

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMENSION = Number(process.env.AGENT_EMBEDDING_DIMENSION || 1536);
const HYBRID_WEIGHTS = {
  semantic: Number(process.env.AGENT_HYBRID_SEMANTIC_WEIGHT || 0.62),
  lexical: Number(process.env.AGENT_HYBRID_LEXICAL_WEIGHT || 0.23),
  metadata: Number(process.env.AGENT_HYBRID_METADATA_WEIGHT || 0.15),
};
const RERANK_MODE = "lightweight_rules_v1";
const RERANK_CANDIDATE_MULTIPLIER = Number(process.env.AGENT_RERANK_CANDIDATE_MULTIPLIER || 4);
const RERANK_MIN_CANDIDATES = Number(process.env.AGENT_RERANK_MIN_CANDIDATES || 12);
const RERANK_MAX_CANDIDATES = Number(process.env.AGENT_RERANK_MAX_CANDIDATES || 20);

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

export async function embedTexts(texts, { provider = process.env.AGENT_EMBEDDING_PROVIDER || "" } = {}) {
  const resolvedProvider = provider || (process.env.BIGMODEL_API_KEY ? "bigmodel" : process.env.OPENAI_API_KEY ? "openai" : "");
  if (resolvedProvider === "bigmodel") {
    if (!process.env.BIGMODEL_API_KEY) return null;
    const result = await callBigModelEmbeddings(texts);
    return result.embeddings;
  }

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

export async function embedTextsWithMetadata(texts, { provider = process.env.AGENT_EMBEDDING_PROVIDER || "" } = {}) {
  const resolvedProvider = provider || (process.env.BIGMODEL_API_KEY ? "bigmodel" : process.env.OPENAI_API_KEY ? "openai" : "");
  if (resolvedProvider === "bigmodel") {
    if (!process.env.BIGMODEL_API_KEY) return null;
    return callBigModelEmbeddings(texts);
  }
  const embeddings = await embedTexts(texts, { provider: resolvedProvider });
  if (!embeddings) return null;
  return {
    embeddings,
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSION,
    usage: null,
  };
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

function denseCosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const av = Number(a[index]);
    const bv = Number(b[index]);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) return null;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (!normA || !normB) return null;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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

function collectionIntentBoost({ chunk, collections }) {
  if (!Array.isArray(collections) || collections.length === 0) return 0;
  const index = collections.indexOf(chunk.collection);
  if (index === -1) return 0;
  return Math.max(0, 0.08 - index * 0.015);
}

function sourceQueryBoost({ chunk, query }) {
  const source = chunk.source || "";
  const text = normalizeText(query);
  let boost = 0;
  if (/no reachable|no result|empty|failed|error|not working|trouble|没有结果|失败|报错/.test(text)) {
    if (source === "faq/troubleshooting.md") boost += 0.16;
    if (source === "methodology/cat_workflow.md") boost += 0.12;
  }
  if (/what can .*tool.*do|what.*cat.*do|how.*use|use.*cat|怎么用|如何使用/.test(text)) {
    if (source === "faq/how_to_use_cat.md") boost += 0.16;
    if (source === "methodology/cat_workflow.md") boost += 0.12;
  }
  if (/nearest|closest|bakery|restaurant|cafe|supermarket|\u6700\u8fd1|\u54ea\u4e2a|\u54ea\u5bb6|\u9762\u5305|\u9910\u5385|\u8d85\u5e02/.test(text)) {
    if (source === "methodology/cat_workflow.md") boost += 0.16;
    if (source === "faq/how_to_use_cat.md") boost += 0.12;
  }
  if (/route|path|navigation|directions|from .* to .+|\u8def\u7ebf|\u8def\u5f84|\u600e\u4e48\u8d70|\u4ece.+\u5230.+/.test(text)) {
    if (source === "methodology/routing_logic.md") boost += 0.18;
    if (source === "methodology/cat_workflow.md") boost += 0.12;
  }
  if (/explain.*result|comfort ratio|latest cat result|解释结果/.test(text)) {
    if (source === "methodology/result_interpretation.md") boost += 0.16;
    if (source === "methodology/data_limitations.md") boost += 0.08;
  }
  return boost;
}

function getRerankCandidateK(topK) {
  const requestedTopK = Math.max(1, Number(topK || 5));
  const expanded = Math.max(requestedTopK * RERANK_CANDIDATE_MULTIPLIER, RERANK_MIN_CANDIDATES);
  return Math.max(requestedTopK, Math.min(RERANK_MAX_CANDIDATES, Math.round(expanded)));
}

function resultSource(result) {
  return result?.metadata?.source || result?.source || "";
}

function sourceMatches(source, candidates) {
  return candidates.some((candidate) => {
    if (candidate.endsWith("/")) return source.startsWith(candidate);
    return source === candidate || source.endsWith(candidate);
  });
}

function intentSourceRerankBoost({ result, intent }) {
  const source = resultSource(result);
  const collection = result.collection || result.metadata?.collection || "";
  const rules = {
    catchment_area_analysis: [
      { sources: ["methodology/cat_workflow.md"], boost: 0.1, reason: "cat_workflow" },
      { sources: ["profiles/"], boost: 0.08, reason: "profile_guidance" },
      { sources: ["variables/"], boost: 0.06, reason: "environment_variables" },
      { sources: ["cities/"], boost: 0.1, reason: "city_data" },
    ],
    area_suitability_question: [
      { sources: ["profiles/"], boost: 0.1, reason: "profile_guidance" },
      { sources: ["variables/"], boost: 0.08, reason: "environment_variables" },
      { sources: ["cities/"], boost: 0.1, reason: "city_data" },
      { sources: ["methodology/result_interpretation.md", "methodology/cat_workflow.md"], boost: 0.06, reason: "area_interpretation" },
    ],
    route_recommendation: [
      { sources: ["methodology/routing_logic.md"], boost: 0.18, reason: "routing_boundary" },
      { sources: ["methodology/cat_workflow.md"], boost: 0.12, reason: "cat_scope" },
      { sources: ["faq/how_to_use_cat.md"], boost: 0.06, reason: "tool_capability" },
    ],
    specific_poi_query: [
      { sources: ["methodology/cat_workflow.md"], boost: 0.18, reason: "cat_scope" },
      { sources: ["faq/how_to_use_cat.md"], boost: 0.12, reason: "tool_capability" },
      { sources: ["methodology/routing_logic.md"], boost: 0.08, reason: "unsupported_poi_boundary" },
    ],
    parameter_recommendation: [
      { sources: ["profiles/"], boost: 0.16, reason: "profile_settings" },
      { sources: ["variables/"], boost: 0.1, reason: "variable_settings" },
    ],
    explain_variable: [
      { sources: ["variables/"], boost: 0.2, reason: "variable_definition" },
    ],
    ask_data_availability: [
      { sources: ["cities/"], boost: 0.16, reason: "city_availability" },
      { sources: ["methodology/data_limitations.md"], boost: 0.1, reason: "data_limitations" },
    ],
    explain_result: [
      { sources: ["methodology/result_interpretation.md"], boost: 0.2, reason: "result_interpretation" },
      { sources: ["methodology/data_limitations.md"], boost: 0.08, reason: "data_limitations" },
      { sources: ["variables/"], boost: 0.06, reason: "variable_context" },
    ],
    compare_with_previous_result: [
      { sources: ["methodology/result_interpretation.md"], boost: 0.18, reason: "comparison_interpretation" },
      { sources: ["methodology/cat_workflow.md"], boost: 0.1, reason: "cat_workflow" },
      { sources: ["methodology/data_limitations.md"], boost: 0.08, reason: "data_limitations" },
      { sources: ["profiles/"], boost: 0.06, reason: "profile_context" },
    ],
    compare_current_with_previous: [
      { sources: ["methodology/result_interpretation.md"], boost: 0.18, reason: "comparison_interpretation" },
      { sources: ["methodology/cat_workflow.md"], boost: 0.1, reason: "cat_workflow" },
      { sources: ["methodology/data_limitations.md"], boost: 0.08, reason: "data_limitations" },
    ],
    compare_two_locations: [
      { sources: ["methodology/result_interpretation.md"], boost: 0.18, reason: "comparison_interpretation" },
      { sources: ["methodology/cat_workflow.md"], boost: 0.1, reason: "cat_workflow" },
      { sources: ["methodology/data_limitations.md"], boost: 0.08, reason: "data_limitations" },
    ],
    compare_profiles: [
      { sources: ["profiles/"], boost: 0.18, reason: "profile_comparison" },
      { sources: ["variables/"], boost: 0.08, reason: "variable_context" },
    ],
    how_to_use: [
      { sources: ["faq/how_to_use_cat.md"], boost: 0.2, reason: "tool_usage" },
      { sources: ["methodology/cat_workflow.md"], boost: 0.12, reason: "cat_workflow" },
    ],
    troubleshooting: [
      { sources: ["faq/troubleshooting.md"], boost: 0.2, reason: "troubleshooting" },
      { sources: ["methodology/data_limitations.md"], boost: 0.08, reason: "data_limitations" },
    ],
  };

  const matched = [];
  let boost = 0;
  for (const rule of rules[intent] || []) {
    if (sourceMatches(source, rule.sources) || rule.sources.includes(`${collection}/`)) {
      boost += rule.boost;
      matched.push(rule.reason);
    }
  }
  return { boost, reasons: matched };
}

function queryCoverageBoost({ result, query }) {
  const queryTokens = [...new Set(tokenize(query))]
    .filter((token) => token.length > 2 || /\p{Script=Han}/u.test(token));
  if (!queryTokens.length) return { boost: 0, coverage: 0 };

  const resultTokens = new Set(tokenize(`${result.title} ${result.content} ${(result.metadata?.tags || []).join(" ")}`));
  const matched = queryTokens.filter((token) => resultTokens.has(token)).length;
  const coverage = matched / queryTokens.length;
  return {
    boost: Math.min(0.1, coverage * 0.1),
    coverage,
  };
}

function metadataRerankBoost({ result, city, profile, variable_key }) {
  const metadata = result.metadata || {};
  const reasons = [];
  let boost = 0;
  if (profile && metadata.profile === profile) {
    boost += 0.1;
    reasons.push("profile_match");
  }
  if (variable_key && metadata.variable_key === variable_key) {
    boost += 0.12;
    reasons.push("variable_match");
  }
  if (city && metadata.city === city) {
    boost += 0.05;
    reasons.push("city_match");
  }
  if (profile && Array.isArray(metadata.tags) && metadata.tags.includes(profile)) {
    boost += 0.04;
    reasons.push("profile_tag");
  }
  if (variable_key && Array.isArray(metadata.tags) && metadata.tags.includes(variable_key)) {
    boost += 0.04;
    reasons.push("variable_tag");
  }
  return { boost, reasons };
}

function intentPenalty({ result, intent }) {
  const source = resultSource(result);
  const collection = result.collection || result.metadata?.collection || "";
  if (intent === "how_to_use" && ["profiles", "variables", "cities"].includes(collection)) {
    return { penalty: 0.08, reasons: ["not_needed_for_tool_capability"] };
  }
  if (["specific_poi_query", "route_recommendation"].includes(intent) && source.startsWith("variables/")) {
    return { penalty: 0.06, reasons: ["variable_detail_less_relevant"] };
  }
  if (intent === "explain_variable" && collection !== "variables") {
    return { penalty: 0.12, reasons: ["not_variable_definition"] };
  }
  return { penalty: 0, reasons: [] };
}

export function rerankKnowledgeResults({ results, query, intent, city, profile, variable_key, topK = 5 }) {
  const candidates = Array.isArray(results) ? results : [];
  const ranked = candidates
    .map((result, index) => {
      const originalSimilarity = clampSimilarity(Number(result.similarity || 0));
      const intentBoost = intentSourceRerankBoost({ result, intent });
      const coverage = queryCoverageBoost({ result, query });
      const metadataBoost = metadataRerankBoost({ result, city, profile, variable_key });
      const penalty = intentPenalty({ result, intent });
      const rerankScore = clampSimilarity(
        originalSimilarity * 0.72 +
        intentBoost.boost +
        coverage.boost +
        metadataBoost.boost -
        penalty.penalty
      );
      const rerankReasons = [
        ...intentBoost.reasons,
        ...metadataBoost.reasons,
        ...(coverage.coverage >= 0.15 ? ["query_overlap"] : []),
        ...penalty.reasons.map((reason) => `penalty:${reason}`),
      ];

      return {
        ...result,
        similarity: rerankScore,
        metadata: {
          ...(result.metadata || {}),
          originalSimilarity,
          originalRank: index + 1,
          rerankScore,
          rerankBoost: Math.round((rerankScore - originalSimilarity) * 10000) / 10000,
          rerankMode: RERANK_MODE,
          rerankReasons,
          queryCoverage: Math.round(coverage.coverage * 10000) / 10000,
        },
      };
    })
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      return (a.metadata?.originalRank || 0) - (b.metadata?.originalRank || 0);
    })
    .map((result, index) => ({
      ...result,
      metadata: {
        ...(result.metadata || {}),
        rerankCandidateRank: index + 1,
      },
    }));

  return applyCoverageGuardrail({ ranked, intent, city, profile, variable_key, topK })
    .map((result, index) => ({
      ...result,
      metadata: {
        ...(result.metadata || {}),
        rerankRank: index + 1,
      },
    }));
}

function applyCoverageGuardrail({ ranked, intent, city, profile, variable_key, topK }) {
  const requirements = getCoverageRequirements({ intent, city, profile, variable_key });
  if (!requirements.length) return ranked.slice(0, topK);

  const selected = [];
  const selectedKeys = new Set();
  const add = (result) => {
    if (!result) return false;
    const source = resultSource(result);
    const key = source || `${result.collection}:${result.title}`;
    if (selectedKeys.has(key)) return false;
    selected.push({
      ...result,
      metadata: {
        ...(result.metadata || {}),
        coverageGuardrail: true,
      },
    });
    selectedKeys.add(key);
    return true;
  };

  for (const requirement of requirements) {
    const match = typeof requirement === "function" ? requirement : requirement?.match;
    if (typeof match !== "function") continue;
    const found = ranked.find((result) => match(result) && !selectedKeys.has(resultSource(result)));
    add(found);
  }

  for (const result of ranked) {
    if (selected.length >= topK) break;
    add(result);
  }

  return selected.slice(0, topK);
}

function getCoverageRequirements({ intent, city, profile, variable_key }) {
  const sourceIs = (source) => (result) => resultSource(result) === source;
  const collectionIs = (collection) => (result) => result.collection === collection;
  const citySource = city ? `cities/${city}.md` : null;
  const profileSource = profile ? `profiles/${profile}.md` : null;

  if (["area_suitability_question", "catchment_area_analysis", "run_accessibility_analysis"].includes(intent)) {
    return [
      profileSource ? sourceIs(profileSource) : collectionIs("profiles"),
      collectionIs("variables"),
      citySource ? sourceIs(citySource) : collectionIs("cities"),
    ];
  }

  if (intent === "ask_data_availability") {
    return [
      citySource ? sourceIs(citySource) : collectionIs("cities"),
      sourceIs("methodology/data_limitations.md"),
    ];
  }

  if (intent === "how_to_use") {
    return [
      sourceIs("faq/how_to_use_cat.md"),
      sourceIs("methodology/cat_workflow.md"),
    ];
  }

  if (intent === "troubleshooting") {
    return [
      sourceIs("faq/troubleshooting.md"),
      sourceIs("methodology/cat_workflow.md"),
    ];
  }

  if (intent === "explain_result") {
    return [
      sourceIs("methodology/result_interpretation.md"),
      collectionIs("variables"),
    ];
  }

  if (intent === "explain_variable") {
    return [
      variable_key
        ? (result) => result.collection === "variables" && result.metadata?.variable_key === variable_key
        : collectionIs("variables"),
    ];
  }

  if (intent === "route_recommendation") {
    return [
      sourceIs("methodology/routing_logic.md"),
      sourceIs("methodology/cat_workflow.md"),
    ];
  }

  if (intent === "specific_poi_query" || intent === "unsupported_specific_poi_query") {
    return [
      sourceIs("methodology/cat_workflow.md"),
      sourceIs("faq/how_to_use_cat.md"),
    ];
  }

  return [];
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
  const raw = await fs.readFile(LOCAL_CHUNKS_FILE, "utf8");
  const payload = JSON.parse(raw);
  return Array.isArray(payload.chunks) ? payload.chunks : [];
}

async function loadLocalKnowledgeEmbeddings() {
  const raw = await fs.readFile(LOCAL_EMBEDDINGS_FILE, "utf8");
  const payload = JSON.parse(raw);
  const items = Array.isArray(payload.items) ? payload.items : [];
  return {
    ...payload,
    byId: new Map(items.map((item) => [item.id, item.embedding])),
  };
}

async function getQueryEmbedding(query, embeddingsPayload) {
  if (!embeddingsPayload || !process.env.BIGMODEL_API_KEY) return null;
  const result = await callBigModelEmbeddings([query]);
  if (result.dimensions && embeddingsPayload.dimensions && Number(result.dimensions) !== Number(embeddingsPayload.dimensions)) {
    return null;
  }
  return result.embeddings?.[0] || null;
}

function combineHybridScore({ semanticSimilarity, lexicalSimilarity, metadataBoost }) {
  if (semanticSimilarity === null || semanticSimilarity === undefined) {
    return clampSimilarity(lexicalSimilarity + metadataBoost);
  }
  const semantic = clampSimilarity((semanticSimilarity + 1) / 2);
  const metadata = clampSimilarity(metadataBoost);
  return clampSimilarity(
    semantic * HYBRID_WEIGHTS.semantic +
    lexicalSimilarity * HYBRID_WEIGHTS.lexical +
    metadata * HYBRID_WEIGHTS.metadata
  );
}

async function retrieveFromLocalChunks({ chunks, query, city, profile, variable_key, collections, topK }) {
  const allowedCollections = new Set(collections);
  const queryVector = normalizeVector(toVector(tokenize(query)));
  let embeddingsPayload = null;
  let queryEmbedding = null;
  try {
    embeddingsPayload = await loadLocalKnowledgeEmbeddings();
    queryEmbedding = await getQueryEmbedding(query, embeddingsPayload);
  } catch {
    embeddingsPayload = null;
    queryEmbedding = null;
  }

  return chunks
    .filter((chunk) => allowedCollections.size === 0 || allowedCollections.has(chunk.collection))
    .filter((chunk) => !city || !chunk.city || chunk.city === city)
    .filter((chunk) => !profile || !chunk.profile || chunk.profile === profile)
    .filter((chunk) => !variable_key || !chunk.variable_key || chunk.variable_key === variable_key)
    .map((chunk) => {
      const vector = normalizeVector(toVector(tokenize(`${chunk.title} ${chunk.content} ${(chunk.tags || []).join(" ")}`)));
      const lexicalSimilarity = cosineSimilarity(queryVector, vector);
      const metadataBoost = metadataRelevanceBoost({ chunk, city, profile, variable_key }) +
        collectionIntentBoost({ chunk, collections }) +
        sourceQueryBoost({ chunk, query });
      const chunkEmbedding = embeddingsPayload?.byId?.get(chunk.id);
      const semanticSimilarity = queryEmbedding && chunkEmbedding ? denseCosineSimilarity(queryEmbedding, chunkEmbedding) : null;
      const similarity = combineHybridScore({ semanticSimilarity, lexicalSimilarity, metadataBoost });
      return {
        title: chunk.title,
        collection: chunk.collection,
        content: chunk.content,
        similarity,
        metadata: {
          source: chunk.source,
          city: chunk.city,
          profile: chunk.profile,
          variable_key: chunk.variable_key,
          tags: chunk.tags,
          chunkIndex: chunk.metadata?.chunkIndex,
          lexicalSimilarity,
          semanticSimilarity,
          metadataBoost,
          retrievalMode: semanticSimilarity === null ? "lexical_metadata" : "hybrid_dense_lexical_metadata",
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
      return await retrieveFromLocalChunks({ chunks, query, city, profile, variable_key, collections, topK });
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

export async function retrieveKnowledge({ query, intent = "general_question", city, profile, variable_key, topK = 5, collections: plannedCollections = null }) {
  const collections = Array.isArray(plannedCollections) && plannedCollections.length
    ? plannedCollections
    : retrievalCollectionsByIntent[intent] || retrievalCollectionsByIntent.general_question;
  const candidateK = getRerankCandidateK(topK);
  const dbResults = await retrieveFromDatabase({ query, city, profile, variable_key, collections, topK: candidateK }).catch((error) => {
    console.warn("[agentKnowledge] database retrieval failed, falling back to local index:", error.message);
    return null;
  });

  if (dbResults) {
    return {
      source: "database",
      collections,
      rerank: {
        enabled: true,
        mode: RERANK_MODE,
        candidateCount: dbResults.length,
        topK,
      },
      results: rerankKnowledgeResults({ results: dbResults, query, intent, city, profile, variable_key, topK }),
    };
  }

  const localResults = await retrieveFromLocalIndex({ query, city, profile, variable_key, collections, topK: candidateK });
  return {
    source: "local_index",
    collections,
    rerank: {
      enabled: true,
      mode: RERANK_MODE,
      candidateCount: localResults.length,
      topK,
    },
    results: rerankKnowledgeResults({ results: localResults, query, intent, city, profile, variable_key, topK }),
  };
}
