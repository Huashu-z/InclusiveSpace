import fs from "fs/promises";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), "public", "data");
const INDEX_FILE = path.join(process.cwd(), "data", "rag_index.json");

const layerNames = {
  streetlight: "夜间照明点",
  trafic_light: "交通信号灯",
  stoplight: "交通信号灯",
  tactile_guidance: "盲道/触觉引导",
  sidewalk_narrow: "人行道变窄",
  stair: "台阶",
  obstacle: "障碍物",
  slope: "坡度",
  poor_pavement: "路面破损",
  wc_disabled: "无障碍卫生间",
  poi_hh_park_spiel: "公园/活动场所",
  poi_hh_health: "健康设施",
  poi_hh_supermarket: "超市",
  poi_hh_haltstelle: "交通站点",
  poi_pt_education: "教育设施",
  poi_pt_gastronomy: "餐饮设施",
  poi_pt_health: "医疗设施",
  poi_pt_library: "图书馆",
  poi_pt_music_exhibition: "文化设施",
  poi_pt_religious: "宗教设施",
  tactile_lines: "盲道线",
  tactile_points: "盲道点",
  tactile_polygons: "盲道区域",
  uneven_surfaces: "不平整路面",
};

const layerAliasText = {
  wc_disabled: "无障碍 厕所 轮椅 卫生 设施",
  slope: "坡度 斜坡 轮椅 无障碍 上坡 下坡",
  poor_pavement: "路面 破损 不平 颠簸 轮椅 不适 震动",
  kerbs_high: "高 路缘 台阶 轮椅 无障碍 路沿",
  obstacle: "障碍 物 障碍物 轮椅 阻挡 通行 障碍",
  sidewalk_narrow: "人行道 狭窄 轮椅 通行 不便",
  tactile_guidance: "触觉 引导 盲道 导盲 视觉 障碍",
  tactile_lines: "触觉 盲道 盲线 视障 引导",
  tactile_points: "触觉 盲点 视障 引导 点",
  tactile_polygons: "盲道 区域 触觉 导向 视觉 障碍",
  uneven_surfaces: "不平 路面 颠簸 坡度 轮椅 不便",
  stair: "台阶 楼梯 轮椅 障碍 转换 高差",
};

const layerSemanticDescriptions = {
  wc_disabled: "无障碍卫生间对轮椅用户及行动不便者非常重要，提供可达性支持和卫生便利。",
  slope: "坡度信息直接影响轮椅出行，陡坡会使轮椅移动困难且不安全。",
  poor_pavement: "路面破损会导致轮椅颠簸、不平稳，并增加行驶难度。",
  kerbs_high: "高路缘是轮椅用户的关键障碍，需要无障碍坡道或平顺路缘。",
  obstacle: "障碍物会阻断轮椅通行，降低整体可达性和路径安全。",
  sidewalk_narrow: "狭窄人行道会限制轮椅通过，影响无障碍通行体验。",
  tactile_guidance: "触觉引导是视障人士的关键设施，有助于安全导航。",
  tactile_lines: "盲道线提供行进参考，帮助视觉障碍者沿路线安全前行。",
  tactile_points: "盲道点通常用于提示转向和重要地点，辅助视觉障碍者导航。",
  tactile_polygons: "盲道区域用于标记安全区域或危险边界，增强视障者环境感知。",
  uneven_surfaces: "不平整路面会降低轮椅与行动不便者的舒适性和通行安全。",
  streetlight: "夜间照明影响可见性和安全性，尤其对视障人士和夜间出行者重要。",
  trafic_light: "交通信号灯提高过街安全性，对行动不便者提供辅助指引。",
  stair: "台阶对于轮椅用户是硬性障碍，需要替代无障碍通道。",
};

const queryExpansionRules = [
  {
    keys: ["无障碍", "无障碍设施", "轮椅", "可达性"],
    expansion: "无障碍 厕所 坡度 路面 破损 路缘 台阶 障碍 人行道 轮椅 便捷",
  },
  {
    keys: ["视觉", "视力", "盲道", "触觉"],
    expansion: "照明 触觉 引导 盲道 交通 信号 指引 安全",
  },
  {
    keys: ["夜间", "照明", "光线"],
    expansion: "照明 夜间 安全 可见性 视线 亮度",
  },
];

const accessibilityLayerBoosts = {
  wc_disabled: 0.18,
  slope: 0.16,
  poor_pavement: 0.14,
  kerbs_high: 0.14,
  obstacle: 0.13,
  sidewalk_narrow: 0.12,
  stair: 0.10,
  uneven_surfaces: 0.11,
};

const visualImpairmentLayerBoosts = {
  tactile_guidance: 0.18,
  tactile_lines: 0.16,
  tactile_points: 0.16,
  tactile_polygons: 0.16,
  streetlight: 0.15,
  trafic_light: 0.14,
};

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
  const dot = keys.reduce((sum, key) => sum + (a[key] || 0) * (b[key] || 0), 0);
  return dot;
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

function getLayerAliasText(layerId) {
  return layerAliasText[layerId] || "";
}

function getLayerSemanticText(layerId) {
  return layerSemanticDescriptions[layerId] || "";
}

function isAccessibilityQuery(query) {
  const normalized = normalizeText(query);
  return ["无障碍", "轮椅", "可达性", "行动不便", "残障", "无障碍设施", "辅助出行"].some((keyword) => normalized.includes(normalizeText(keyword)));
}

function isVisualImpairmentQuery(query) {
  const normalized = normalizeText(query);
  return ["视觉", "视力", "盲道", "触觉", "视障", "夜间照明"].some((keyword) => normalized.includes(normalizeText(keyword)));
}

function getAccessibilityBoost(query, layerId) {
  let boost = 0;
  if (isAccessibilityQuery(query)) {
    boost += accessibilityLayerBoosts[layerId] || 0;
  }
  if (isVisualImpairmentQuery(query)) {
    boost += visualImpairmentLayerBoosts[layerId] || 0;
  }
  return boost;
}

export async function listGeoJsonFiles(rootDir = DATA_ROOT) {
  const results = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listGeoJsonFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".geojson")) {
      results.push(entryPath);
    }
  }
  return results;
}

export async function listLocaleJsonFiles(rootDir = path.join(process.cwd(), "public", "locales")) {
  const results = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await listLocaleJsonFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(entryPath);
    }
  }
  return results;
}

function readJson(filePath) {
  return fs.readFile(filePath, "utf8").then((raw) => JSON.parse(raw));
}

function flattenTranslationValues(obj) {
  const values = [];
  if (typeof obj === "string") {
    values.push(obj);
    return values;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      values.push(...flattenTranslationValues(item));
    }
    return values;
  }
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj).sort()) {
      values.push(...flattenTranslationValues(obj[key]));
    }
  }
  return values;
}

function getLayerDescription(fileName) {
  const id = fileName.replace(/\.geojson$/i, "");
  return layerNames[id] || layerNames[id.replace(/^poi_/, "poi_")] || id;
}

async function readGeoJson(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
}

function extractPropertyKeys(features = []) {
  const keys = new Set();
  for (const feature of features) {
    if (feature?.properties && typeof feature.properties === "object") {
      Object.keys(feature.properties).forEach((key) => keys.add(key));
    }
    if (keys.size >= 12) break;
  }
  return Array.from(keys).sort();
}

function buildDocument({ id, city, layerId, description, summary, text, metadata }) {
  const aliasText = getLayerAliasText(layerId);
  const semanticText = getLayerSemanticText(layerId);
  const tokens = tokenize(`${description} ${summary} ${text} ${aliasText} ${semanticText}`);
  const vector = normalizeVector(toVector(tokens));
  return {
    id,
    city,
    layerId,
    description,
    summary,
    text,
    metadata,
    vector,
  };
}

function buildSiteDocument({ id, locale, name, description, summary, text, metadata }) {
  return buildDocument({
    id,
    city: "site",
    layerId: "site",
    description,
    summary,
    text,
    metadata: {
      ...metadata,
      locale,
      source: "site",
    },
  });
}

export async function buildRagIndex({ outputPath = INDEX_FILE, minFeatures = 1 } = {}) {
  const files = await listGeoJsonFiles();
  const docs = [];

  for (const filePath of files) {
    const relative = path.relative(DATA_ROOT, filePath).replace(/\\/g, "/");
    const [cityOrPOI, ...rest] = relative.split("/");
    const fileName = rest[rest.length - 1];
    const layerId = fileName.replace(/\.geojson$/i, "");
    const city = cityOrPOI === "POI" ? "poi" : cityOrPOI;
    const description = getLayerDescription(layerId);
    let geojson;

    try {
      geojson = await readGeoJson(filePath);
    } catch (error) {
      console.warn(`[ragIndex] 无法解析 ${filePath}:`, error.message);
      continue;
    }

    const features = Array.isArray(geojson.features) ? geojson.features : [];
    if (features.length < minFeatures) continue;

    const propertyKeys = extractPropertyKeys(features);
    const summary = `${description} 在 ${city} 的要素数量为 ${features.length}。`;
    const text = `${summary} 主要属性包括 ${propertyKeys.join("、") || "无"}。`;

    docs.push(buildDocument({
      id: `${city}_${layerId}`,
      city,
      layerId,
      description,
      summary,
      text,
      metadata: {
        filePath: path.relative(process.cwd(), filePath),
        propertyKeys,
        count: features.length,
      },
    }));
  }

  const localeFiles = await listLocaleJsonFiles();
  for (const filePath of localeFiles) {
    const relative = path.relative(path.join(process.cwd(), "public", "locales"), filePath).replace(/\\/g, "/");
    const [locale, fileName] = relative.split("/");
    let localeJson;

    try {
      localeJson = await readJson(filePath);
    } catch (error) {
      console.warn(`[ragIndex] 无法读取翻译文件 ${filePath}:`, error.message);
      continue;
    }

    const values = flattenTranslationValues(localeJson).filter(Boolean);
    if (!values.length) continue;

    const summary = `Site copy from ${locale}/${fileName}`;
    const text = values.join(" ");

    docs.push(buildSiteDocument({
      id: `site_${locale}_${fileName.replace(/\.json$/i, "")}`,
      locale,
      name: fileName,
      description: `网页文案 (${locale}/${fileName})`,
      summary,
      text,
      metadata: {
        filePath: path.relative(process.cwd(), filePath),
        locale,
        source: "locale-json",
        entryCount: values.length,
      },
    }));
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({ createdAt: new Date().toISOString(), docs }, null, 2), "utf8");
  return { path: outputPath, documents: docs.length };
}

export async function loadRagIndex(indexPath = INDEX_FILE) {
  const raw = await fs.readFile(indexPath, "utf8");
  const payload = JSON.parse(raw);
  return payload;
}

export function queryRagIndex({ index, query, city, topK = 5 }) {
  const expansion = expandQueryText(query);
  const queryVector = normalizeVector(toVector(tokenize(`${query} ${expansion}`)));
  const scored = index.docs.map((doc) => ({
    ...doc,
    score: cosineSimilarity(queryVector, doc.vector),
  }));

  const filtered = city
    ? scored.filter((doc) => doc.city === city || doc.city === "poi" || doc.city === "site")
    : scored;

  const boosted = filtered.map((doc) => {
    const boost = getAccessibilityBoost(query, doc.layerId);
    return {
      ...doc,
      score: doc.score + boost,
    };
  });

  return boosted
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((doc) => ({ id: doc.id, description: doc.description, score: doc.score, summary: doc.summary, metadata: doc.metadata }));
}
