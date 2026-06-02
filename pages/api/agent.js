import { summarizeSpatialContext, buildLegendSummary, describeProfile, generateMockAgentResponse, generateRegionRecommendations } from "../../utils/spatialRag.js";
import { loadRagIndex, queryRagIndex } from "../../utils/ragIndex.js";
import { getRecommendedRegionsByQuery } from "../../utils/recommendedRegions.js";
import { cityLayerConfig } from "../../components/cityVariableConfig.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_MOCK_AGENT = process.env.USE_MOCK_AGENT === "true";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
let cachedRagIndex = null;

async function getRagIndex() {
  if (!cachedRagIndex) {
    cachedRagIndex = await loadRagIndex().catch(() => ({ docs: [] }));
  }
  return cachedRagIndex;
}

function buildRagContext({ index, prompt, city, topK = 4 }) {
  if (!index?.docs?.length || !prompt) return { text: "", results: [] };
  const results = queryRagIndex({ index, query: prompt, city, topK });
  const text = results.length
    ? results.map((doc, index) => `${index + 1}. ${doc.description}：${doc.summary}`).join("\n")
    : "";
  return { text, results };
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
            "你是一个可解释的城市可达性分析助手。请只返回 JSON，包含 reply, score, factors, suggestedSettings, highlights, rawSummary。不要编造几何数据，只基于给定的图层摘要和用户画像。",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI 失败：${response.status} ${body}`);
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
  const startPointText = startPoint && startPoint.length === 2
    ? `当前起点约为：(${startPoint[1].toFixed(6)}, ${startPoint[0].toFixed(6)})。`
    : "未提供具体起点。";
  return [`用户输入：${prompt || "请根据当前配置与画像进行可达性分析。"}`,
    `用户画像：${profileText}`,
    `起点信息：${startPointText}`,
    `图例摘要：${legendSummary}`,
    `空间数据摘要：${spatialSummary.text}`,
    ragContext ? `检索到的相关图层摘要：${ragContext}` : "",
    `请给出一段清晰的解释，评分（0-100），3个关键影响因素，以及推荐参数设置。`,
  ].filter(Boolean).join("\n\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, profile, selectedCity = "hamburg", layerIds = [], startPoint = null, mode } = req.body;
    const city = typeof selectedCity === "string" ? selectedCity : "hamburg";
    const chosenLayerIds = Array.isArray(layerIds) && layerIds.length > 0 ? layerIds : (cityLayerConfig[city]?.mapLayers || []).map((m) => m.key);
    
    // 检测问题类型：区域推荐 vs 点位查询
    const normalizedPrompt = (prompt || "").toLowerCase();
    const isRegionQuery = /哪些?区域|哪些?地方|哪个区域|哪个地方|推荐|最适合|比较适合|各区|市内|城市内/.test(normalizedPrompt);
    
    if (USE_MOCK_AGENT || !OPENAI_API_KEY) {
      const ragIndex = await getRagIndex();
      const ragContext = buildRagContext({ index: ragIndex, prompt, city });

      // 区域推荐模式
      if (isRegionQuery && !startPoint) {
        const recommendedRegions = getRecommendedRegionsByQuery(prompt, city);
        const regionResponse = generateRegionRecommendations({
          prompt,
          profile,
          selectedCity: city,
          recommendedRegions
        });
        return res.status(200).json({ ...regionResponse, mode: "mock", ragContext: ragContext.text, ragResults: ragContext.results });
      }
      
      // 点位查询模式
      const bbox = Array.isArray(startPoint) && startPoint.length === 2
        ? [startPoint[0] - 0.01, startPoint[1] - 0.01, startPoint[0] + 0.01, startPoint[1] + 0.01]
        : null;

      const spatialSummary = await summarizeSpatialContext({ selectedCity: city, layerIds: chosenLayerIds, bbox });
      const legendSummary = buildLegendSummary(chosenLayerIds);
      
      const mock = generateMockAgentResponse({ prompt, profile, layerIds: chosenLayerIds, spatialSummary, legendSummary, startPoint });
      return res.status(200).json({ ...mock, mode: "mock", ragContext: ragContext.text, ragResults: ragContext.results });
    }

    // LLM 模式（不含 mock）
    const bbox = Array.isArray(startPoint) && startPoint.length === 2
      ? [startPoint[0] - 0.01, startPoint[1] - 0.01, startPoint[0] + 0.01, startPoint[1] + 0.01]
      : null;

    const spatialSummary = await summarizeSpatialContext({ selectedCity: city, layerIds: chosenLayerIds, bbox });
    const legendSummary = buildLegendSummary(chosenLayerIds);
    const ragIndex = await getRagIndex();
    const ragContext = buildRagContext({ index: ragIndex, prompt, city });

    const agentPrompt = buildAgentPrompt({ profile, prompt, selectedCity: city, legendSummary, spatialSummary, startPoint, ragContext: ragContext.text });
    const aiResult = await callOpenAI(agentPrompt);
    return res.status(200).json({ ...aiResult, rawSummary: spatialSummary.text, ragContext: ragContext.text, ragResults: ragContext.results, mode: "gpt" });
  } catch (error) {
    console.error("Agent API error:", error);
    res.status(500).json({ error: error.message || "Agent 路由内部错误" });
  }
}
