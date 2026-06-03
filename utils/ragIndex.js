import fs from "fs/promises";
import path from "path";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");
const INDEX_FILE = path.join(process.cwd(), "data", "rag_index.json");

const queryExpansionRules = [
  {
    keys: ["elderly", "older", "senior", "老年", "老人"],
    expansion: "elderly slow walking stair slope unevenSurface poorPavement kerbsHigh obstacle light station wcDisabled",
  },
  {
    keys: ["wheelchair", "轮椅", "無障礙", "无障碍"],
    expansion: "wheelchair stair kerbsHigh slope narrowRoads poorPavement unevenSurface obstacle wcDisabled ramp",
  },
  {
    keys: ["visual", "blind", "visually impaired", "视障", "盲道"],
    expansion: "visually impaired tactile_pavement light trafficLight obstacle guidance",
  },
  {
    keys: ["stroller", "children", "family", "婴儿车", "儿童", "家庭"],
    expansion: "children family stroller narrowRoads kerbsHigh stair obstacle poorPavement unevenSurface facility",
  },
  {
    keys: ["noise", "light", "kerbsHigh", "slope", "comfort ratio", "变量", "含义"],
    expansion: "comfort variable meaning positive negative factor recommended sensitivity",
  },
  {
    keys: ["hamburg", "penteli", "data", "available", "availability", "数据"],
    expansion: "city availability map layers limited variables missing data warnings",
  },
];

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
    if (/\p{Script=Han}/u.test(token)) {
      return Array.from(token).filter((char) => char.trim().length > 0);
    }
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
  const norm = Math.sqrt(Object.values(vec).reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return Object.fromEntries(Object.entries(vec).map(([k, v]) => [k, v / norm]));
}

function cosineSimilarity(a = {}, b = {}) {
  const keys = Object.keys(a).length < Object.keys(b).length ? Object.keys(a) : Object.keys(b);
  return keys.reduce((sum, key) => sum + (a[key] || 0) * (b[key] || 0), 0);
}

function expandQueryText(query) {
  const normalized = normalizeText(query);
  const expansions = new Set();
  for (const rule of queryExpansionRules) {
    if (rule.keys.some((key) => normalized.includes(normalizeText(key)))) {
      rule.expansion.split(/\s+/).filter(Boolean).forEach((token) => expansions.add(token));
    }
  }
  return Array.from(expansions).join(" ");
}

async function listMarkdownFiles(rootDir = KNOWLEDGE_ROOT) {
  const results = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(entryPath);
    }
  }
  return results;
}

function parseFrontmatter(raw) {
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

function getTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

function buildKnowledgeDocument({ filePath, raw }) {
  const { metadata, content } = parseFrontmatter(raw);
  const relativePath = path.relative(KNOWLEDGE_ROOT, filePath).replace(/\\/g, "/");
  const id = relativePath.replace(/\.md$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_");
  const title = metadata.title || getTitle(content, path.basename(filePath, ".md"));
  const collection = metadata.collection || relativePath.split("/")[0] || "general";
  const summary = content.split(/\r?\n/).find((line) => line.trim() && !line.startsWith("#"))?.trim() || title;
  const text = `${title}\n${content}`;
  const vector = normalizeVector(toVector(tokenize(`${title} ${collection} ${summary} ${text} ${(metadata.tags || []).join(" ")}`)));

  return {
    id,
    city: metadata.city || null,
    layerId: metadata.variable_key || metadata.profile || collection,
    description: title,
    summary,
    text,
    collection,
    title,
    content,
    metadata: {
      ...metadata,
      collection,
      source: relativePath,
      filePath: relativePath,
    },
    vector,
  };
}

export async function buildRagIndex({ outputPath = INDEX_FILE } = {}) {
  const files = await listMarkdownFiles();
  const docs = [];
  const failed = [];

  for (const filePath of files) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      docs.push(buildKnowledgeDocument({ filePath, raw }));
    } catch (error) {
      failed.push({ filePath, error: error.message });
      console.warn(`[ragIndex] Unable to parse ${filePath}:`, error.message);
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ createdAt: new Date().toISOString(), docs, failed }, null, 2), "utf8");
  return { path: outputPath, documents: docs.length, failed };
}

export async function loadRagIndex(indexPath = INDEX_FILE) {
  const raw = await fs.readFile(indexPath, "utf8");
  return JSON.parse(raw);
}

function cityMatches(doc, city) {
  return !city || !doc.city || doc.city === city;
}

export function queryRagIndex({ index, query, city, topK = 5, collections = [] }) {
  const docs = Array.isArray(index?.docs) ? index.docs : [];
  const expansion = expandQueryText(query);
  const queryVector = normalizeVector(toVector(tokenize(`${query} ${expansion}`)));
  const allowedCollections = new Set(collections);

  return docs
    .filter((doc) => cityMatches(doc, city))
    .filter((doc) => allowedCollections.size === 0 || allowedCollections.has(doc.collection || doc.metadata?.collection))
    .map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryVector, doc.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((doc) => ({
      id: doc.id,
      title: doc.title || doc.description,
      description: doc.description,
      collection: doc.collection || doc.metadata?.collection,
      content: doc.content || doc.text,
      score: doc.score,
      summary: doc.summary,
      metadata: doc.metadata,
    }));
}
