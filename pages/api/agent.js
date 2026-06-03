import {
  summarizeSpatialContext,
  buildLegendSummary,
  describeProfile,
  generateMockAgentResponse,
  generateRegionRecommendations,
} from "../../utils/spatialRag.js";
import { loadRagIndex, queryRagIndex } from "../../utils/ragIndex.js";
import { getRecommendedRegionsByQuery } from "../../utils/recommendedRegions.js";
import { cityLayerConfig } from "../../components/cityVariableConfig.js";
import { getProfilePreset } from "../../components/agent/profilePresets.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_MOCK_AGENT = process.env.USE_MOCK_AGENT === "true";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
const AGENT_SCHEMA_VERSION = "2026-06-p0";

let cachedRagIndex = null;

const knowledgeModes = new Set([
  "explain_variable",
  "ask_data_availability",
  "explain_result",
  "compare_profiles",
  "how_to_use",
  "troubleshooting",
  "general_question",
]);

const intentCollections = {
  run_accessibility_analysis: ["profiles", "variables", "cities"],
  region_recommendation: ["profiles", "variables", "cities"],
  explain_variable: ["variables"],
  ask_data_availability: ["cities", "methodology"],
  explain_result: ["methodology", "variables"],
  compare_profiles: ["profiles", "variables"],
  how_to_use: ["faq", "methodology"],
  troubleshooting: ["faq", "methodology"],
  general_question: ["methodology", "faq", "profiles", "variables", "cities"],
};

const variableAliases = {
  noise: ["noise", "noisy", "traffic noise", "噪声", "噪音"],
  light: ["light", "lighting", "street light", "streetlight", "照明", "路灯"],
  trafficLight: ["traffic light", "crossing", "signal", "红绿灯", "交通信号"],
  tactile_pavement: ["tactile", "tactile paving", "blind guidance", "盲道", "触觉"],
  station: ["station", "public transport", "bus stop", "train", "车站", "公共交通"],
  wcDisabled: ["accessible toilet", "wheelchair toilet", "toilet", "无障碍厕所", "无障碍卫生间"],
  narrowRoads: ["narrow", "narrow sidewalk", "窄路", "狭窄", "人行道"],
  stair: ["stair", "stairs", "step", "台阶", "楼梯"],
  obstacle: ["obstacle", "barrier", "blockage", "障碍"],
  slope: ["slope", "hill", "steep", "坡度", "斜坡"],
  unevenSurface: ["uneven", "uneven surface", "rough surface", "不平", "不平整"],
  poorPavement: ["poor pavement", "damaged pavement", "broken sidewalk", "破损", "路面"],
  kerbsHigh: ["kerb", "kerbs", "curb", "kerbshigh", "high kerb", "高路缘", "路缘"],
  facility: ["facility", "facilities", "shops", "benches", "设施"],
  pedestrianFlow: ["pedestrian flow", "crowd", "crowded", "人流", "拥挤"],
  greeninf: ["green", "green space", "park", "绿地", "绿色"],
  blueinf: ["blue", "water", "waterfront", "水体", "蓝色"],
  temperatureSummer: ["summer", "heat", "hot", "夏季", "炎热"],
  temperatureWinter: ["winter", "cold", "icy", "冬季", "寒冷"],
};

async function getRagIndex() {
  if (!cachedRagIndex) {
    cachedRagIndex = await loadRagIndex().catch(() => ({ docs: [] }));
  }
  return cachedRagIndex;
}

function hasValidStartPoint(startPoint) {
  return Array.isArray(startPoint) &&
    startPoint.length === 2 &&
    Number.isFinite(Number(startPoint[0])) &&
    Number.isFinite(Number(startPoint[1]));
}

function detectMentionedCity(prompt, fallbackCity) {
  const text = (prompt || "").toLowerCase();
  if (text.includes("penteli") || text.includes("彭特利")) return "penteli";
  if (text.includes("hamburg") || text.includes("汉堡")) return "hamburg";
  return fallbackCity;
}

function detectMentionedVariable(prompt) {
  const text = (prompt || "").toLowerCase();
  for (const [key, aliases] of Object.entries(variableAliases)) {
    if (aliases.some((alias) => text.includes(alias.toLowerCase()))) return key;
  }
  return null;
}

function detectAgentIntent(prompt, { startPoint } = {}) {
  const text = (prompt || "").toLowerCase();
  const hasProfileCue = /elderly|older|senior|wheelchair|stroller|children|family|visual|blind|老年|老人|轮椅|婴儿车|儿童|家庭|视障|盲/.test(text);
  const hasRunCue = /convenient|accessible|move around|walking|walk|suitable|can i|is this area|analysis|analyze|catchment|方便|适合|可达|通行|步行|分析|计算/.test(text);

  if (/how.*use|use.*cat|instruction|guide|怎么用|如何使用|网页|界面|使用/.test(text)) return "how_to_use";
  if (/trouble|error|failed|not working|no reachable|empty|问题|报错|失败|没有结果|无法/.test(text)) return "troubleshooting";
  if (/what.*mean|meaning|explain.*variable|does .* mean|是什么|什么意思|含义|解释.*变量/.test(text) && detectMentionedVariable(prompt)) return "explain_variable";
  if (/data|available|availability|have .* data|support|missing|unavailable|有没有|是否有|支持|可用|缺少|数据/.test(text) && (text.includes("hamburg") || text.includes("penteli") || detectMentionedVariable(prompt))) return "ask_data_availability";
  if (/comfort ratio|result|explain this|解释结果|结果|面积|ratio/.test(text)) return "explain_result";
  if (/compare|difference|which profile|对比|比较/.test(text)) return "compare_profiles";
  if (hasProfileCue || hasRunCue || startPoint) return "run_accessibility_analysis";
  return "general_question";
}

function buildRagContext({ index, prompt, city, topK = 4, collections = [] }) {
  if (!index?.docs?.length || !prompt) return { text: "", results: [] };
  const results = queryRagIndex({ index, query: prompt, city, topK, collections });
  const text = results.length
    ? results.map((doc, index) => `${index + 1}. ${doc.description}: ${doc.summary}`).join("\n")
    : "";
  return { text, results };
}

function extractLine(content, label) {
  const line = (content || "").split(/\r?\n/).find((item) => item.toLowerCase().startsWith(label.toLowerCase()));
  return line ? line.replace(/^[^:]+:\s*/, "").trim() : "";
}

function extractVariableSection(content, variableKey) {
  if (!content || !variableKey) return "";
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `variable key: ${variableKey}`.toLowerCase());
  if (start < 0) return "";

  const section = [];
  for (let i = start; i < lines.length; i += 1) {
    if (i !== start && lines[i].startsWith("Variable key:")) break;
    if (lines[i].trim()) section.push(lines[i].trim());
  }
  return section.join("\n");
}

function buildKnowledgeResponse({ intent, city, ragContext, detectedVariable }) {
  const results = ragContext.results || [];
  const first = results[0];
  const content = first?.content || first?.summary || "";

  if (intent === "explain_variable") {
    const variableDoc = results.find((doc) => doc.collection === "variables") || first;
    const section = extractVariableSection(variableDoc?.content, detectedVariable);
    return {
      mode: intent,
      reply: section || `我找到了和 ${detectedVariable || "该变量"} 相关的 CAT comfort variable 知识，但当前知识库中没有更细的独立段落。`,
      score: null,
      factors: [],
      suggestedSettings: {},
      highlights: {},
      rawSummary: ragContext.text,
      askRealComputation: false,
    };
  }

  if (intent === "ask_data_availability") {
    const cityDoc = results.find((doc) => doc.collection === "cities" && (!doc.metadata?.city || doc.metadata.city === city)) ||
      results.find((doc) => doc.collection === "cities") ||
      first;
    const cityContent = cityDoc?.content || "";
    const available = extractLine(cityContent, "Available variables");
    const unavailable = extractLine(cityContent, "Unavailable or limited variables");
    const layers = extractLine(cityContent, "Available map layers");

    return {
      mode: intent,
      reply: [
        `${cityDoc?.title || city} 的数据可用性如下：`,
        available ? `可用变量：${available}` : "",
        unavailable ? `不可用或受限变量：${unavailable}` : "",
        layers ? `可用图层：${layers}` : "",
        "注意：这些是城市级数据可用性说明，不代表某个具体地点的空间事实。具体地点仍需通过 CAT 地图分析流程计算。",
      ].filter(Boolean).join("\n"),
      score: null,
      factors: [],
      suggestedSettings: {},
      highlights: {},
      rawSummary: ragContext.text,
      askRealComputation: false,
    };
  }

  const replyByIntent = {
    how_to_use: "CAT 的基本流程是：选择城市，设置 walking time 和 walking speed，选择起点，启用你关心的 comfort variables，调整敏感度，然后运行 catchment area analysis。\n\nAgent 的作用是把自然语言需求转换成可检查的 CAT 设置；在运行前，用户应该能看到 profile、速度、时间、变量和不可用数据提醒。",
    troubleshooting: "如果网页没有结果，优先检查：是否选择了起点、walking time 和 walking speed 是否合理、当前城市是否支持所选变量。如果 comfort-adjusted area 为空，可以减少变量数量或降低某些变量的敏感度。",
    explain_result: "结果解释必须基于真实 result metadata，例如 default area、comfort-adjusted area、comfort ratio、enabled variables 和 missing data warnings。没有这些 metadata 时，我不能编造某个地点有很多台阶或障碍物。",
    compare_profiles: "不同 profile 会使用不同的默认速度和 comfort variable 权重。最终参数应来自 deterministic profile presets，并经过城市可用性过滤，而不是由 LLM 自由发明。",
    general_question: content || "我会优先基于 CAT 知识库回答一般问题；只有当问题明确要求分析某个地点或区域时，才触发可达性分析。",
  };

  return {
    mode: intent,
    reply: replyByIntent[intent] || replyByIntent.general_question,
    score: null,
    factors: [],
    suggestedSettings: {},
    highlights: {},
    rawSummary: ragContext.text,
    askRealComputation: false,
  };
}

async function callOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a CAT accessibility agent. Return JSON only. Do not invent map results. Use RAG knowledge for text explanations and spatial summaries only for map analysis.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(content);
  } catch {
    return { reply: content, score: null, factors: [], suggestedSettings: {}, highlights: {}, rawSummary: prompt };
  }
}

function buildAgentPrompt({ profile, prompt, selectedCity, legendSummary, spatialSummary, startPoint, ragContext }) {
  const profileText = describeProfile(profile);
  const startPointText = hasValidStartPoint(startPoint)
    ? `Current start point is approximately (${startPoint[1].toFixed(6)}, ${startPoint[0].toFixed(6)}).`
    : "No concrete start point was provided.";

  return [
    `User input: ${prompt || "Please analyze accessibility based on the current settings."}`,
    `User profile: ${profileText}`,
    `City: ${selectedCity}`,
    `Start point: ${startPointText}`,
    `Legend summary: ${legendSummary}`,
    `Spatial data summary: ${spatialSummary.text}`,
    ragContext ? `RAG context: ${ragContext}` : "",
    "Return JSON with reply, score, factors, suggestedSettings, highlights, rawSummary. Do not invent geometry or map results.",
  ].filter(Boolean).join("\n\n");
}

function buildAgentEnvelope(result, { runtimeMode, selectedCity, selectedLayerCount, startPoint }) {
  const semanticMode = result?.mode || (hasValidStartPoint(startPoint) ? "point_analysis" : "agent_response");
  const isKnowledgeMode = knowledgeModes.has(semanticMode);
  const canRunRealComputation =
    (semanticMode === "point_analysis" && hasValidStartPoint(startPoint)) ||
    (semanticMode === "region_recommendation" &&
      Array.isArray(result?.recommendedRegions) &&
      result.recommendedRegions.length > 0);

  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    ...result,
    mode: semanticMode,
    runtimeMode,
    confidence: {
      level: "medium",
      basis: isKnowledgeMode
        ? "local_rag_knowledge"
        : runtimeMode === "mock"
          ? "heuristic_spatial_summary_and_local_rag"
          : "llm_response_grounded_by_spatial_summary_and_local_rag",
      caveat: isKnowledgeMode
        ? "This answer is grounded in the local CAT knowledge base and does not run map analysis."
        : "AI analysis is an estimate until pgRouting catchment computation is run.",
    },
    execution: {
      canRunRealComputation,
      realComputationStatus: "not_started",
      analysisType: semanticMode,
      selectedCity,
      selectedLayerCount,
      hasStartPoint: hasValidStartPoint(startPoint),
    },
  };
}

function applyProfilePresetToResult(result, profile) {
  const preset = getProfilePreset(profile?.presetId || profile?.id);
  if (!preset) return result;

  return {
    ...result,
    profilePreset: {
      id: preset.id,
      label: preset.label,
      walkingSpeed: preset.walkingSpeed,
      walkingTime: preset.walkingTime,
      enabledVariables: preset.enabledVariables,
      layerValues: preset.layerValues,
    },
    suggestedSettings: { ...preset.layerValues },
  };
}

function buildErrorPayload(message, { status = 500, recoverable = true } = {}) {
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    error: message,
    recoverable,
    status,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json(buildErrorPayload("Method not allowed", { status: 405, recoverable: false }));
  }

  try {
    const { prompt, profile, selectedCity = "hamburg", layerIds = [], startPoint = null } = req.body;
    const baseCity = typeof selectedCity === "string" ? selectedCity : "hamburg";
    const city = detectMentionedCity(prompt, baseCity);
    const chosenLayerIds = Array.isArray(layerIds) && layerIds.length > 0
      ? layerIds
      : (cityLayerConfig[city]?.mapLayers || []).map((m) => m.key);

    const normalizedPrompt = (prompt || "").toLowerCase();
    const isRegionQuery = /哪些?区域|哪些?地方|哪个区域|哪个地方|推荐|最适合|比较适合|各区|市内|城市内/.test(normalizedPrompt);
    const intent = isRegionQuery && !startPoint ? "region_recommendation" : detectAgentIntent(prompt, { startPoint });
    const ragIndex = await getRagIndex();
    const ragContext = buildRagContext({
      index: ragIndex,
      prompt,
      city,
      collections: intentCollections[intent] || intentCollections.general_question,
    });

    console.log("[agent]", {
      intent,
      city,
      profile: profile?.id || null,
      locationText: hasValidStartPoint(startPoint) ? "startPoint" : null,
    });

    if (knowledgeModes.has(intent)) {
      const knowledgeResponse = buildKnowledgeResponse({
        intent,
        city,
        ragContext,
        detectedVariable: detectMentionedVariable(prompt),
      });
      return res.status(200).json(buildAgentEnvelope(
        { ...knowledgeResponse, ragContext: ragContext.text, ragResults: ragContext.results },
        { runtimeMode: USE_MOCK_AGENT || !OPENAI_API_KEY ? "mock" : "gpt", selectedCity: city, selectedLayerCount: 0, startPoint: null },
      ));
    }

    if (USE_MOCK_AGENT || !OPENAI_API_KEY) {
      if (intent === "region_recommendation") {
        const recommendedRegions = getRecommendedRegionsByQuery(prompt, city);
        const regionResponse = generateRegionRecommendations({
          prompt,
          profile,
          selectedCity: city,
          recommendedRegions,
        });
        return res.status(200).json(buildAgentEnvelope(
          applyProfilePresetToResult({ ...regionResponse, mode: "region_recommendation", ragContext: ragContext.text, ragResults: ragContext.results }, profile),
          { runtimeMode: "mock", selectedCity: city, selectedLayerCount: chosenLayerIds.length, startPoint },
        ));
      }

      const bbox = hasValidStartPoint(startPoint)
        ? [startPoint[0] - 0.01, startPoint[1] - 0.01, startPoint[0] + 0.01, startPoint[1] + 0.01]
        : null;
      const spatialSummary = await summarizeSpatialContext({ selectedCity: city, layerIds: chosenLayerIds, bbox });
      const legendSummary = buildLegendSummary(chosenLayerIds);
      const mock = generateMockAgentResponse({ prompt, profile, layerIds: chosenLayerIds, spatialSummary, legendSummary, startPoint });

      return res.status(200).json(buildAgentEnvelope(
        applyProfilePresetToResult({ ...mock, mode: "point_analysis", ragContext: ragContext.text, ragResults: ragContext.results }, profile),
        { runtimeMode: "mock", selectedCity: city, selectedLayerCount: chosenLayerIds.length, startPoint },
      ));
    }

    const bbox = hasValidStartPoint(startPoint)
      ? [startPoint[0] - 0.01, startPoint[1] - 0.01, startPoint[0] + 0.01, startPoint[1] + 0.01]
      : null;
    const spatialSummary = await summarizeSpatialContext({ selectedCity: city, layerIds: chosenLayerIds, bbox });
    const legendSummary = buildLegendSummary(chosenLayerIds);
    const agentPrompt = buildAgentPrompt({ profile, prompt, selectedCity: city, legendSummary, spatialSummary, startPoint, ragContext: ragContext.text });
    const aiResult = await callOpenAI(agentPrompt);

    return res.status(200).json(buildAgentEnvelope(
      applyProfilePresetToResult({ ...aiResult, mode: "point_analysis", rawSummary: spatialSummary.text, ragContext: ragContext.text, ragResults: ragContext.results }, profile),
      { runtimeMode: "gpt", selectedCity: city, selectedLayerCount: chosenLayerIds.length, startPoint },
    ));
  } catch (error) {
    console.error("Agent API error:", error);
    return res.status(500).json(buildErrorPayload(error.message || "Agent route internal error"));
  }
}
