import fs from "fs/promises";
import path from "path";

const layerDescriptions = {
  streetlight: "夜间照明点",
  trafic_light: "交通信号灯",
  trafic_light_wms: "交通信号灯图层",
  stoplight: "交通信号灯",
  tactile_guidance: "盲道/触觉引导",
  sidewalk_narrow: "人行道变窄",
  stair: "台阶",
  obstacle: "障碍物",
  slope: "坡度",
  slope_penteli: "坡度",
  temp_summer: "夏季温度",
  temp_winter: "冬季温度",
  wc_disabled: "无障碍卫生间",
  poi_hh_park_spiel: "公园/活动场所",
  poi_hh_health: "健康设施",
  poi_hh_supermarket: "超市",
  poi_hh_haltstelle: "交通站点",
  poi_pt_education: "教育设施",
  poi_pt_gastronomy: "餐饮设施",
  poi_pt_health: "医疗设施",
  poi_pt_haltstelle: "交通站点",
  poi_pt_library: "图书馆",
  poi_pt_music_exhibition: "文化设施",
  poi_pt_religious: "宗教设施",
};

const profileSummaries = {
  elderly: "老年人，行动速度较慢，对坡度、台阶、夜间照明和便利设施敏感。",
  stroller: "推婴儿车人士，对人行道通畅、路缘坡道和避障能力敏感。",
  wheelchair: "轮椅使用者，对台阶、路缘高差、障碍物和无障碍设施敏感。",
  visual_impairment: "视觉障碍用户，对照明、触觉引导、交通信号和障碍物敏感。",
  hearing_impairment: "听力障碍用户，对噪声、照明、交通信号和人流密度敏感。",
  cognitive_impairment: "认知障碍用户，对光照、狭窄道路、不规则路面和人流环境敏感。"
};

const layerDisplayNames = {
  noise: "噪声",
  light: "照明",
  tree: "绿化",
  trafficLight: "交通信号",
  tactile_pavement: "触觉引导",
  temperatureSummer: "夏季温度",
  temperatureWinter: "冬季温度",
  blueinf: "蓝色基础设施",
  greeninf: "绿色基础设施",
  station: "交通站点",
  wcDisabled: "无障碍厕所",
  narrowRoads: "狭窄道路",
  stair: "台阶",
  obstacle: "障碍物",
  slope: "坡度",
  unevenSurface: "不平坦路面",
  poorPavement: "路面破损",
  kerbsHigh: "高路缘",
  facility: "设施可达性",
  pedestrianFlow: "人流密度"
};

function getLayerDescription(key) {
  return layerDescriptions[key] || layerDisplayNames[key] || key;
}

function pointInBBox(coord, bbox) {
  if (!Array.isArray(coord) || coord.length < 2 || !bbox) return false;
  const [x, y] = coord;
  const [xmin, ymin, xmax, ymax] = bbox;
  return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
}

function featureInBBox(feature, bbox) {
  if (!bbox || !feature?.geometry) return true;
  const { type, coordinates } = feature.geometry;
  if (!coordinates) return false;

  if (type === "Point") {
    return pointInBBox(coordinates, bbox);
  }
  if (type === "MultiPoint" || type === "LineString") {
    return coordinates.some((coord) => pointInBBox(coord, bbox));
  }
  if (type === "MultiLineString" || type === "Polygon") {
    return coordinates.some((ring) =>
      (Array.isArray(ring[0]) ? ring : [ring]).some((coord) => pointInBBox(coord, bbox))
    );
  }
  if (type === "MultiPolygon") {
    return coordinates.some((polygon) =>
      polygon.some((ring) => ring.some((coord) => pointInBBox(coord, bbox)))
    );
  }
  return false;
}

async function readGeoJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function selectSampleHighlights(features) {
  return features.slice(0, 3).map((feature, index) => {
    const id = feature?.properties?.gid ?? feature?.properties?.id ?? index;
    return id;
  });
}

export async function summarizeSpatialContext({ selectedCity = "hamburg", layerIds = [], bbox = null }) {
  const result = {
    selectedCity,
    layerSummaries: {},
    highlights: {},
    metrics: {},
    text: "",
  };

  const summaries = [];
  const counts = {};
  const discoveredLayers = [];

  for (const layerId of layerIds) {
    const filename = layerId.endsWith(".geojson") ? layerId : `${layerId}.geojson`;
    const pathParts = layerId.startsWith("poi_") ? ["POI", filename] : [selectedCity, filename];
    const filePath = path.join(process.cwd(), "public", "data", ...pathParts);
    const geojson = await readGeoJsonFile(filePath);
    if (!geojson || !Array.isArray(geojson.features)) continue;

    const total = geojson.features.length;
    const inside = bbox
      ? geojson.features.filter((feature) => featureInBBox(feature, bbox)).length
      : total;
    const type = geojson.features[0]?.geometry?.type || "Unknown";
    const description = getLayerDescription(layerId);
    const sampleHighlights = selectSampleHighlights(geojson.features);

    result.layerSummaries[layerId] = {
      description,
      type,
      total,
      inside,
      sampleHighlights,
      properties: geojson.features[0]?.properties || {}
    };
    result.highlights[layerId] = sampleHighlights;
    discoveredLayers.push(description);
    counts[layerId] = { total, inside };
  }

  const summaryLines = [];
  if (discoveredLayers.length > 0) {
    summaryLines.push(`当前分析图层包括：${discoveredLayers.join("，")}。`);
    for (const [layerId, summary] of Object.entries(result.layerSummaries)) {
      summaryLines.push(`图层 ${summary.description} 共有 ${summary.total} 个要素` + (bbox ? `，其中 ${summary.inside} 个位于当前视图范围内。` : "。"));
    }
  } else {
    summaryLines.push(`当前没有可用的图层数据，或者图层未加载。`);
  }

  const issueLayers = ["stair", "obstacle", "sidewalk_narrow", "slope", "poor_pavement", "kerbs_high", "wc_disabled", "tactile_guidance"];
  const issueNotes = [];
  for (const issueLayer of issueLayers) {
    const summary = result.layerSummaries[issueLayer];
    if (!summary) continue;
    if (summary.total > 0) {
      issueNotes.push(`检测到 ${summary.total} 个 ${summary.description}`);
    }
  }
  if (issueNotes.length > 0) {
    summaryLines.push(`可能影响可达性的主要因素：${issueNotes.join("；")}。`);
  }

  result.metrics = {
    selectedLayerCount: Object.keys(result.layerSummaries).length,
    totalFeatureCount: Object.values(result.layerSummaries).reduce((sum, item) => sum + item.total, 0),
    selectedFeatureCount: Object.values(result.layerSummaries).reduce((sum, item) => sum + item.inside, 0)
  };

  result.text = summaryLines.join(" ");
  return result;
}

export function buildLegendSummary(layerIds = []) {
  if (!Array.isArray(layerIds) || layerIds.length === 0) return "未选择具体图层，显示默认可访问性数据。";
  const names = layerIds.map((id) => getLayerDescription(id));
  return `当前图例主要涵盖：${names.join("，")}。`;
}

export function describeProfile(profile) {
  if (!profile) return "未选择用户画像。";
  if (profileSummaries[profile.id]) {
    return `${profile.label || profile.id}：${profileSummaries[profile.id]}`;
  }
  if (profile.label) {
    return `${profile.label}。`;
  }
  return "匿名用户画像，已选择特定可达性偏好。";
}

const defaultNegativeWeights = {
  stair: 8,
  obstacle: 8,
  sidewalk_narrow: 7,
  slope: 7,
  poor_pavement: 7,
  kerbs_high: 8,
};

const profileScoringWeights = {
  wheelchair: {
    stair: 14,
    kerbs_high: 12,
    obstacle: 10,
    slope: 10,
    poor_pavement: 8,
    sidewalk_narrow: 8,
    wc_disabled: { bonus: 8, missingPenalty: 8 },
    streetlight: { bonus: 4, missingPenalty: 4 },
  },
  elderly: {
    slope: 10,
    stair: 8,
    kerbs_high: 7,
    poor_pavement: 7,
    obstacle: 7,
    streetlight: { bonus: 6, missingPenalty: 6 },
    wc_disabled: { bonus: 4, missingPenalty: 4 },
  },
  visual_impairment: {
    obstacle: 10,
    tactile_guidance: { bonus: 10, missingPenalty: 10 },
    streetlight: { bonus: 8, missingPenalty: 8 },
    trafic_light: { bonus: 6, missingPenalty: 6 },
    trafic_light_wms: { bonus: 6, missingPenalty: 6 },
  },
  stroller: {
    stair: 10,
    kerbs_high: 10,
    obstacle: 8,
    sidewalk_narrow: 9,
    poor_pavement: 8,
    slope: 7,
    streetlight: { bonus: 4, missingPenalty: 4 },
  },
};

const supportLayerDefaults = {
  wc_disabled: { bonus: 5, missingPenalty: 5 },
  tactile_guidance: { bonus: 6, missingPenalty: 6 },
  streetlight: { bonus: 4, missingPenalty: 4 },
  light: { bonus: 4, missingPenalty: 4 },
  trafic_light: { bonus: 4, missingPenalty: 4 },
  trafic_light_wms: { bonus: 4, missingPenalty: 4 },
};

const profileScoreCaps = {
  wheelchair: { negative: 27, positive: 20 },
  elderly: { negative: 30, positive: 18 },
  visual_impairment: { negative: 30, positive: 20 },
  stroller: { negative: 32, positive: 18 },
  default: { negative: 34, positive: 16 },
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPenaltyByCount(count, maxPenalty) {
  if (count <= 0) return 0;
  if (count <= 2) return maxPenalty * 0.25;
  if (count <= 10) return maxPenalty * 0.5;
  if (count <= 50) return maxPenalty * 0.8;
  return maxPenalty;
}

function getProfileWeight(profileId, layerId) {
  const profileWeights = profileScoringWeights[profileId] || {};
  const profileValue = profileWeights[layerId];
  if (typeof profileValue === "number") return profileValue;
  return defaultNegativeWeights[layerId] || 0;
}

function getSupportWeight(profileId, layerId) {
  const profileWeights = profileScoringWeights[profileId] || {};
  const profileValue = profileWeights[layerId];
  if (profileValue && typeof profileValue === "object") return profileValue;
  return supportLayerDefaults[layerId] || null;
}

function getSupportThreshold(layerId) {
  if (["streetlight", "light"].includes(layerId)) return 6;
  if (["trafic_light", "trafic_light_wms"].includes(layerId)) return 2;
  return 1;
}

function getProfileScoreCaps(profileId) {
  return profileScoreCaps[profileId] || profileScoreCaps.default;
}

export function generateMockAgentResponse({ prompt, profile, layerIds, spatialSummary, legendSummary, startPoint }) {
  const normalizedPrompt = (prompt || "").toLowerCase();
  const isElderly = profile?.id === "elderly" || /老年/.test(normalizedPrompt);
  const isWheelchair = profile?.id === "wheelchair" || /轮椅/.test(normalizedPrompt);
  const isVisual = profile?.id === "visual_impairment" || /视觉/.test(normalizedPrompt);
  const isStroller = profile?.id === "stroller" || /婴儿车/.test(normalizedPrompt);
  const isNight = /夜间|照明|光线/.test(normalizedPrompt);
  const isNoise = /噪声|嘈杂/.test(normalizedPrompt);
  const isCrossing = /过街|斑马线|交通/.test(normalizedPrompt);

  const scoreBase = 70;
  let score = scoreBase;
  const factors = [];
  const suggestedSettings = {};
  const profileId = isWheelchair
    ? "wheelchair"
    : isElderly
      ? "elderly"
      : isVisual
        ? "visual_impairment"
        : isStroller
          ? "stroller"
          : profile?.id;
  const hasStartPoint = startPoint && startPoint.length === 2;
  const regionLabel = hasStartPoint
    ? `当前起点附近区域（经度 ${startPoint[0].toFixed(6)}, 纬度 ${startPoint[1].toFixed(6)}）`
    : "当前可见图层区域";
  const locationText = hasStartPoint
    ? `当前起点坐标为 (${startPoint[1].toFixed(6)}, ${startPoint[0].toFixed(6)})。`
    : "未提供具体起点坐标。";

  if (spatialSummary?.metrics?.selectedLayerCount === 0) {
    return {
      reply: "当前未选择图层，无法基于区域数据给出精细分析。请先选择可见图层或起点，然后重新提问。",
      score: null,
      factors: [],
      suggestedSettings: {},
      highlights: {},
      rawSummary: spatialSummary?.text || ""
    };
  }

  const promptImportance = [isNight, isNoise, isCrossing, isElderly, isWheelchair, isVisual, isStroller].filter(Boolean).length;
  if (promptImportance > 0) {
    score -= Math.min(6, promptImportance * 1.5);
  }

  let negativePenaltyTotal = 0;
  let supportBonusTotal = 0;

  for (const layerId of layerIds) {
    const summary = spatialSummary.layerSummaries[layerId];
    if (!summary) continue;
    const { inside = 0 } = summary;
    if (["stair", "obstacle", "sidewalk_narrow", "slope", "poor_pavement", "kerbs_high"].includes(layerId)) {
      if (inside > 0) {
        const maxPenalty = getProfileWeight(profileId, layerId);
        const penalty = getPenaltyByCount(inside, maxPenalty);
        factors.push({
          name: summary.description,
          value: `${inside} 个`, 
          impact: penalty >= maxPenalty * 0.8 ? "high" : penalty >= maxPenalty * 0.5 ? "medium" : "low",
          explain: `在 ${regionLabel} 中检测到 ${inside} 个 ${summary.description}，这会降低可达性。`
        });
        score -= penalty;
        negativePenaltyTotal += penalty;
      }
    }
    if (["streetlight", "light", "trafic_light", "trafic_light_wms"].includes(layerId)) {
      const support = getSupportWeight(profileId, layerId);
      const threshold = getSupportThreshold(layerId);
      if (inside < threshold) {
        const penalty = support?.missingPenalty ?? 4;
        factors.push({
          name: summary.description,
          value: inside === 0 ? "缺失" : `较少 (${inside})`, 
          impact: "medium",
          explain: `在 ${regionLabel} 中 ${summary.description} 数量偏少，可能影响夜间和过街体验。`
        });
        score -= penalty;
        negativePenaltyTotal += penalty;
      } else {
        const bonus = support?.bonus ?? 4;
        score += bonus;
        supportBonusTotal += bonus;
      }
    }
    if (["wc_disabled", "tactile_guidance"].includes(layerId)) {
      const support = getSupportWeight(profileId, layerId);
      if (inside === 0) {
        const penalty = support?.missingPenalty ?? 5;
        factors.push({
          name: summary.description,
          value: "缺失",
          impact: "medium",
          explain: `在 ${regionLabel} 中未检测到 ${summary.description}，可能影响特殊用户的可达性。`
        });
        score -= penalty;
        negativePenaltyTotal += penalty;
      } else {
        const bonus = support?.bonus ?? 5;
        score += bonus;
        supportBonusTotal += bonus;
      }
    }
  }

  const scoreCaps = getProfileScoreCaps(profileId);
  if (negativePenaltyTotal > scoreCaps.negative) {
    score += negativePenaltyTotal - scoreCaps.negative;
  }
  if (supportBonusTotal > scoreCaps.positive) {
    score -= supportBonusTotal - scoreCaps.positive;
  }

  if (isElderly) {
    suggestedSettings.light = 0.7;
    suggestedSettings.stair = 0.2;
    suggestedSettings.kerbsHigh = 0.3;
    suggestedSettings.slope = 0.7;
  }
  if (isWheelchair) {
    suggestedSettings.stair = 0.1;
    suggestedSettings.obstacle = 0.2;
    suggestedSettings.kerbsHigh = 0.2;
    suggestedSettings.facility = 0.6;
  }
  if (isVisual) {
    suggestedSettings.light = 0.8;
    suggestedSettings.tactile_pavement = 0.9;
    suggestedSettings.obstacle = 0.5;
  }
  if (isStroller) {
    suggestedSettings.narrowRoads = 0.5;
    suggestedSettings.poorPavement = 0.6;
    suggestedSettings.obstacle = 0.6;
  }

  if (isNight && !suggestedSettings.light) {
    suggestedSettings.light = 0.6;
  }
  if (isNoise && !suggestedSettings.noise) {
    suggestedSettings.noise = 0.7;
  }
  if (isCrossing && !suggestedSettings.trafficLight) {
    suggestedSettings.trafficLight = 0.7;
  }

  if (factors.length === 0) {
    factors.push({ name: "区域总体", value: "良好", impact: "low", explain: `在 ${regionLabel} 内没有发现显著的关键问题。` });
    score += 4;
  }

  score = clampScore(score);

  const questionIntent = /适合|可以|好不好|怎么样|适宜/.test(normalizedPrompt)
    ? `${regionLabel}对于当前用户的步行可达性总体上是${score >= 60 ? "相对友好" : "需要改进"}的。`
    : /如何|改进|改善|提高/.test(normalizedPrompt)
      ? `如果您想改善这一区域的可达性，建议重点关注下列因素。`
      : `以下是基于${hasStartPoint ? "当前起点" : "当前区域"}统计的可达性分析结果。`;

  const summaryNotice = `${locationText} ${regionLabel} 的数据提示：${spatialSummary.text}`;
  const answerPrefix = isNight
    ? "夜间视角来看，重点关注照明情况。"
    : isNoise
      ? "噪声相关问题是本区域的一个关键因素。"
      : `基于当前问题，${questionIntent}`;

  // 构建更具可读性的响应：
  // 1) 明确结论（是否适合）
  // 2) 引用参考资料（哪些图层/要素支持结论）
  // 3) 推荐参数
  // 4) 询问是否应用参数并运行真实计算

  const conclusion = score >= 60 ? `结论：基于当前数据，${regionLabel} 对于该用户类型总体上是相对友好的（得分 ${score}/100）。` : `结论：基于当前数据，${regionLabel} 对于该用户类型存在改进需求（得分 ${score}/100），建议在出行前注意下列问题。`;

  // 参考资料：列出关键图层的计数与示例 highlights
  const references = [];
  for (const [layerId, summary] of Object.entries(spatialSummary.layerSummaries || {})) {
    const inside = summary.inside ?? summary.total ?? 0;
    if (inside > 0) {
      references.push({
        layer: layerId,
        description: summary.description,
        count: inside,
        sampleHighlights: spatialSummary.highlights?.[layerId] || summary.sampleHighlights || []
      });
    }
  }

  const referencesText = references.length > 0
    ? `参考资料：${references.map(r => `${r.description}（${r.count} 个）`).join('，')}。` 
    : '参考资料：当前视图内未检测到支持性图层要素。';

  const suggestedSettingsText = Object.keys(suggestedSettings).length > 0
    ? `推荐环境参数：${Object.entries(suggestedSettings).map(([k,v]) => `${k}: ${v}`).join('，')}。` 
    : '未生成特定的参数建议。';

  const cta = '是否要应用这些推荐参数并在当前起点/选定区域运行真实计算以获得更精确的可达性结果？（是：应用并运行真实计算 / 否：仅查看建议）';

  const reply = `您问的是：“${prompt}”。\n\n${conclusion}\n\n${answerPrefix} ${summaryNotice} ${legendSummary}\n\n${referencesText}\n\n${suggestedSettingsText}\n\n${cta}`;

  return {
    reply,
    score,
    factors,
    suggestedSettings,
    highlights: spatialSummary.highlights,
    rawSummary: spatialSummary.text,
    references,
    mode: "point_analysis",
    askRealComputation: true,
  };
}

export function generateRegionRecommendations({ prompt, profile, selectedCity = "hamburg", recommendedRegions = [] }) {
  const normalizedPrompt = (prompt || "").toLowerCase();
  const profileText = describeProfile(profile);
  
  const isElderly = profile?.id === "elderly" || /老年|老人|年长|退休/.test(normalizedPrompt);
  const isStroller = profile?.id === "stroller" || /婴儿|婴儿车|推车|儿童|孩子/.test(normalizedPrompt);
  const isNight = /夜间|晚上|夜晚|夜|天黑|照明/.test(normalizedPrompt);
  const isWheelchair = profile?.id === "wheelchair" || /轮椅|行动|无障碍|不便|障碍|坡度|台阶/.test(normalizedPrompt);

  const suggestedSettings = {};
  if (isElderly) {
    suggestedSettings.light = 0.7;
    suggestedSettings.stair = 0.2;
    suggestedSettings.slope = 0.7;
  }
  if (isStroller) {
    suggestedSettings.narrowRoads = 0.5;
    suggestedSettings.obstacle = 0.6;
    suggestedSettings.slope = 0.6;
  }
  if (isNight) {
    suggestedSettings.light = 0.85;
  }
  if (isWheelchair) {
    suggestedSettings.stair = 0.1;
    suggestedSettings.obstacle = 0.2;
    suggestedSettings.slope = 0.3;
  }

  const regionList = recommendedRegions && recommendedRegions.length > 0
    ? recommendedRegions
    : [];

  let intro = "";
  if (isElderly) {
    intro = "根据老年人的可达性需求，以下区域较为友好：";
  } else if (isStroller) {
    intro = "这些区域特别适合推婴儿车散步：";
  } else if (isNight) {
    intro = "夜间出行比较安全舒适的区域包括：";
  } else if (isWheelchair) {
    intro = "轮椅使用者较为方便的区域有：";
  } else {
    intro = "推荐以下可达性较好的区域：";
  }

  const regionSummary = regionList
    .slice(0, 3)
    .map((r, idx) => `${idx + 1}. ${r.name}（可达性得分 ${r.score}/100）：${r.description}。主要优势：${r.reasons.join("、")}。`)
    .join("\n");
  const replyHeader = `您问的是："${prompt}"。`;

  const topRegion = regionList && regionList.length > 0 ? regionList[0] : null;
  const conclusion = topRegion
    ? `结论：基于当前启发式评估，优先推荐 ${topRegion.name}（得分 ${topRegion.score}/100）。` 
    : `结论：未找到明确的推荐区域。`;

  // 为每个推荐区域准备参考信息（来源与优势）
  const regionReferences = regionList.slice(0,3).map(r => ({
    id: r.id,
    name: r.name,
    score: r.score,
    description: r.description,
    reasons: r.reasons
  }));

  const referencesText = regionReferences.length > 0
    ? `参考资料：${regionReferences.map(r => `${r.name}（得分 ${r.score}）: ${r.description}`).join('；')}`
    : '参考资料：无。';

  const suggestedSettingsText = Object.keys(suggestedSettings).length > 0
    ? `推荐环境参数（供选择）：${Object.entries(suggestedSettings).map(([k,v]) => `${k}: ${v}`).join('，')}。`
    : '未生成特定参数建议。';

  const cta = '下一步：是否将其中某一推荐区域设为起点并应用推荐参数后运行真实计算以获得基于路网的精确分析？（请选择区域并确认）';

  const reply = [
    replyHeader,
    '\n',
    conclusion,
    '\n',
    intro,
    '\n',
    regionSummary,
    '\n\n',
    referencesText,
    '\n\n',
    suggestedSettingsText,
    '\n\n',
    cta
  ].join(' ');

  const factors = regionList.slice(0, 2).map(r => ({
    name: r.name,
    value: `${r.score} 分`,
    impact: "high",
    explain: r.description,
  }));

  return {
    reply,
    score: null,
    factors,
    suggestedSettings,
    highlights: {},
    rawSummary: regionSummary,
    references: regionReferences,
    mode: "region_recommendation",
    recommendedRegions: regionList,
    askRealComputation: true,
  };
}
