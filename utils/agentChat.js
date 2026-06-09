import { cityLayerConfig } from "../components/cityVariableConfig.js";
import { getProfilePreset } from "../components/agent/profilePresets.js";
import { applyLlmRoutingToDetected, understandAgentQuery } from "./agentQueryUnderstanding.js";
import { retrieveKnowledge } from "./agentKnowledge.js";
import { filterVariablesByCity } from "./cityVariableFiltering.js";
import { geocodeLocation } from "./agentGeocode.js";
import { maybeBuildLlmAgentResponse, maybeClassifyIntentWithLlm } from "./agentLlm.js";
import { inferProfileFromRetrievedKnowledge } from "./profileInference.js";
import { checkAgentCapability } from "./agentCapabilities.js";
import {
  buildAnalysisComparison,
  resolveAnalysisReferences,
} from "./agentMemory.js";
import {
  evaluateRagSufficiency,
  repairUngroundedReply,
  runFinalGroundingCheck,
  selectAnswerMode,
} from "./agentAnswerQuality.js";
import {
  SAFE_CITIES,
  SAFE_INTENTS,
  safeFallback,
  validateAgentAction,
  validateAgentReply,
} from "./agentSafety.js";

const allowedCities = SAFE_CITIES;
const allowedIntents = SAFE_INTENTS;
const FAST_ACTION_INTENTS = new Set([
  "catchment_area_analysis",
  "area_suitability_question",
  "run_accessibility_analysis",
]);

function isGenericLocationText(locationText, city) {
  const text = String(locationText || "").trim().toLowerCase();
  return !text ||
    text === String(city || "").toLowerCase() ||
    ["hamburg", "penteli", "station", "the station"].includes(text);
}

function hasUsableResultMetadata(resultMetadata) {
  if (Array.isArray(resultMetadata)) return resultMetadata.length > 0;
  return Boolean(resultMetadata && typeof resultMetadata === "object" && Object.keys(resultMetadata).length > 0);
}

function shouldUseFastActionPath({ detected, capabilityCheck, resultMetadata }) {
  return FAST_ACTION_INTENTS.has(detected?.intent) &&
    capabilityCheck?.shouldRunDirectAction === true &&
    !hasUsableResultMetadata(resultMetadata);
}

function makeFastDoc({ title, collection, source, content, similarity = 1, metadata = {} }) {
  return {
    title,
    collection,
    content,
    similarity,
    metadata: {
      source,
      fastPath: true,
      ...metadata,
    },
  };
}

function buildFastPathRetrieval({ detected, action }) {
  const docs = [];
  const profile = action?.profile || detected?.profile || "default_adult";
  if (profile) {
    docs.push(makeFastDoc({
      title: `${profile} profile`,
      collection: "profiles",
      source: `profiles/${profile}.md`,
      content: `Fast-path profile evidence for ${profile}. Full profile knowledge is available in the CAT knowledge base if the user asks for explanation.`,
      metadata: { profile },
    }));
  }
  docs.push(makeFastDoc({
    title: "Comfort variables",
    collection: "variables",
    source: "variables/comfort_variables.md",
    content: "Fast-path variable grounding for CAT comfort settings. Detailed variable definitions are retrieved only for knowledge questions or result explanations.",
  }));
  docs.push(makeFastDoc({
    title: `${detected.city} data availability`,
    collection: "cities",
    source: `cities/${detected.city}.md`,
    content: `Fast-path city grounding for ${detected.city}. Detailed data availability is retrieved when the user asks about data or limitations.`,
    metadata: { city: detected.city },
  }));
  return {
    source: "fast_path_static",
    collections: ["profiles", "variables", "cities"],
    rerank: {
      enabled: false,
      mode: "fast_path_static",
      candidateCount: docs.length,
      topK: docs.length,
    },
    results: docs,
  };
}

function toCitation(doc, index) {
  return {
    id: doc.metadata?.source ? `${doc.metadata.source}#${doc.metadata.chunkIndex || index + 1}` : `retrieved-${index + 1}`,
    title: doc.title,
    collection: doc.collection,
    source: doc.metadata?.source || null,
    similarity: doc.similarity,
  };
}

function buildKnowledgeReply({ detected, retrieval, capabilityCheck = null }) {
  const top = retrieval.results[0];
  if (detected.intent === "route_recommendation") {
    const profile = detected.profile || "default_adult";
    const origin = detected.locationText || "the selected/start location";
    const destination = detected.destinationText || "the destination";
    return [
      `你问的是从 ${origin} 到 ${destination} 的具体路线，尤其是“最舒适路线”。当前 CAT 不能直接计算 A 到 B 的路线、路径几何或路线排序，所以我不能把某一条路线说成答案。`,
      "",
      `和你的问题相关的是：我可以识别到出行画像为 ${profile}，也可以把 ${origin} 作为起点，用 CAT 计算在该画像和舒适度变量下的可达区域。这个结果可以告诉你从起点出发哪些区域更可能可达、舒适度约束会让可达范围缩小多少，但它不能等同于“到 ${destination} 的最佳路线”。`,
      "",
      `建议操作：如果你想做替代分析，可以运行从 ${origin} 出发的舒适可达区域分析；如果你需要精确路线，需要具备 origin-destination routing / least-cost routing 的地图工具。`,
      capabilityCheck?.closestSupportedAlternative
        ? `Closest supported CAT alternative: ${capabilityCheck.closestSupportedAlternative}.`
        : "",
    ].filter(Boolean).join("\n");
  }
  if (detected.intent === "specific_poi_query" || detected.intent === "unsupported_specific_poi_query") {
    const profile = detected.profile || "default_adult";
    const location = detected.locationText ? `，起点似乎是 ${detected.locationText}` : "";
    return [
      "这个问题我不能直接回答“最近的是哪个具体面包房”。CAT 当前专注于可达性区域和舒适度影响分析，不做具体 POI 的最近距离排序、店铺推荐或路径导航。",
      "",
      `和你的问题相关的是：我可以识别到你描述的出行画像是 ${profile}${location}。在 CAT 里，这可以用于计算从起点出发，在儿童/家庭这类行动假设下哪些区域可达，以及这些区域受到台阶、路面、过街信号、设施等环境因素影响的程度。`,
      "",
      "建议操作：如果你想判断“从主火附近带三岁小孩步行活动大概能覆盖哪里”，请运行可达区域分析；如果你需要“最近的具体面包房是哪一家”，需要使用带 POI 排序/路线规划能力的地图或本地搜索工具，CAT 的结果只能作为可达范围参考。",
    ].join("\n");
  }
  if (detected.intent === "explain_variable" && top) {
    return top.content;
  }
  if (detected.intent === "ask_data_availability" && top) {
    return `${top.title}\n\n${top.content}`;
  }
  if (detected.intent === "how_to_use") {
    return "CAT workflow: choose a city, set walking time and walking speed, select a start point, enable comfort variables, adjust their sensitivity values, then run catchment area analysis. The agent prepares checkable settings first; the frontend decides whether to apply and run them.";
  }
  if (detected.intent === "troubleshooting") {
    return top?.content || "If no result appears, check whether a start point is selected, walking time and walking speed are valid, and the current city supports the selected variables.";
  }
  if (detected.intent === "explain_result") {
    return "Result explanation needs actual result metadata such as default area, comfort-adjusted area, comfort ratio, enabled variables, POI count, and missing data warnings. Without those fields, the agent must not invent spatial causes.";
  }
  return top?.content || "I will answer from the local CAT knowledge base. I only return a map-analysis action when the user explicitly asks to run accessibility analysis.";
}

async function buildAlternativeAction({ detected, currentMapState = {}, capabilityCheck }) {
  if (capabilityCheck?.closestSupportedAlternative !== "comfort_based_catchment_area_analysis") return null;
  const action = await buildRunAction({ detected, currentMapState });
  return {
    ...action,
    isAlternative: true,
    isDirectAnswer: false,
    alternativeFor: detected.intent,
    label: action.coordinates
      ? `Run alternative catchment analysis from ${action.locationText || "the selected start point"}`
      : "Apply alternative CAT settings and select a start point",
    limitation: `This is a related CAT catchment analysis, not a direct ${capabilityCheck.requiredCapability} answer.`,
  };
}

async function buildRunAction({ detected, currentMapState = {} }) {
  const preset = getProfilePreset(detected.profile || "default_adult") || getProfilePreset("default_adult");
  const cityFiltered = filterVariablesByCity({
    city: detected.city,
    enabledVariables: preset.enabledVariables,
    layerValues: preset.layerValues,
    requestedVariables: [detected.variable_key],
  });
  const shouldGeocode = detected.locationText && !isGenericLocationText(detected.locationText, detected.city);
  const geocoded = shouldGeocode
    ? await geocodeLocation({ locationText: detected.locationText, city: detected.city })
    : null;
  const hasCoordinates = Array.isArray(geocoded?.coordinates) &&
    geocoded.coordinates.length === 2 &&
    geocoded.coordinates.every((value) => Number.isFinite(Number(value)));
  const hasSpecificGeocodedPoint = hasCoordinates && !isGenericLocationText(detected.locationText, detected.city);
  const hasCurrentStartPoint = Array.isArray(currentMapState.startPoint) &&
    currentMapState.startPoint.length === 2 &&
    currentMapState.startPoint.every((value) => Number.isFinite(Number(value)));
  const coordinates = hasSpecificGeocodedPoint
    ? geocoded.coordinates
    : hasCurrentStartPoint
      ? currentMapState.startPoint.map(Number)
      : null;
  const actionType = coordinates ? "RUN_ACCESSIBILITY_ANALYSIS" : "ASK_USER_TO_SELECT_POINT";
  const geocodingWarnings = detected.locationText && !hasCoordinates
    ? [`Could not geocode "${detected.locationText}". Please select a start point on the map.`]
    : [];
  const nextStep = coordinates
    ? "apply_and_run"
    : "select_start_point";

  return {
    type: actionType,
    profile: preset.id,
    profileInference: detected.profileInference || null,
    city: detected.city,
    locationText: detected.locationText,
    coordinates,
    geocoding: geocoded,
    walkingTime: Number(currentMapState.walkingTime) || preset.walkingTime,
    walkingSpeed: preset.walkingSpeed,
    enabledVariables: cityFiltered.enabledVariables,
    layerValues: cityFiltered.layerValues,
    requiresStartPoint: !coordinates,
    canRunNow: Boolean(coordinates),
    nextStep,
    missingDataWarnings: [...cityFiltered.missingDataWarnings, ...geocodingWarnings],
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeResultMetadata(resultMetadata) {
  const items = Array.isArray(resultMetadata)
    ? resultMetadata
    : resultMetadata && typeof resultMetadata === "object"
      ? [resultMetadata]
      : [];

  const defaultResult = [...items].reverse().find((item) => item?.isDefault) || null;
  const weightedResult = [...items].reverse().find((item) => item && !item.isDefault) || null;
  const latest = weightedResult || defaultResult || items[items.length - 1] || null;
  if (!latest) return null;

  const defaultArea = toNumber(defaultResult?.area ?? resultMetadata?.defaultArea);
  const weightedArea = toNumber(weightedResult?.area ?? resultMetadata?.weightedArea);
  const metadataRatio = toNumber(weightedResult?.weightedRatio ?? resultMetadata?.comfortRatio);
  const computedRatio = defaultArea && weightedArea ? weightedArea / defaultArea : null;
  const comfortRatio = metadataRatio ?? computedRatio;
  const enabledVariables = Array.isArray(weightedResult?.layers)
    ? weightedResult.layers
    : Array.isArray(resultMetadata?.enabledVariables)
      ? resultMetadata.enabledVariables
      : [];

  return {
    profile: resultMetadata?.profile || latest.profile || null,
    city: resultMetadata?.city || latest.city || null,
    walkingTime: toNumber(latest.time ?? resultMetadata?.walkingTime),
    walkingSpeed: toNumber(latest.speed ?? resultMetadata?.walkingSpeed),
    defaultArea,
    weightedArea,
    comfortRatio,
    enabledVariables,
    layerValues: weightedResult?.values || resultMetadata?.layerValues || {},
    poiCount: toNumber(weightedResult?.poiCount ?? defaultResult?.poiCount ?? resultMetadata?.poiCount),
    poiGroupCounts: weightedResult?.poiGroupCounts || defaultResult?.poiGroupCounts || resultMetadata?.poiGroupCounts || null,
    missingDataWarnings: Array.isArray(resultMetadata?.missingDataWarnings)
      ? resultMetadata.missingDataWarnings
      : Array.isArray(latest.missingDataWarnings)
        ? latest.missingDataWarnings
        : [],
    hasWeightedResult: Boolean(weightedResult),
  };
}

function getResultMetadataVariables(resultMetadata) {
  const normalized = normalizeResultMetadata(resultMetadata);
  return normalized?.enabledVariables || [];
}

function formatKnownNumber(value, suffix = "") {
  return value === null || value === undefined ? "not available" : `${Number(value).toFixed(2)}${suffix}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateResultScore(normalized) {
  if (!normalized?.hasWeightedResult || normalized.comfortRatio === null || normalized.comfortRatio === undefined) {
    return null;
  }
  return clamp(Math.round(Number(normalized.comfortRatio) * 100), 0, 100);
}

function getScoreLabel(score) {
  if (score === null || score === undefined) return "not enough computed data";
  if (score >= 75) return "generally suitable";
  if (score >= 50) return "partly suitable with noticeable comfort constraints";
  return "limited suitability under the selected comfort assumptions";
}

function buildResultExplanation({ resultMetadata, detected, currentMapState = {}, agentContext = null }) {
  const normalized = normalizeResultMetadata(resultMetadata);
  if (!normalized) {
    return buildKnowledgeReply({ detected, retrieval: { results: [] } });
  }

  const profile = normalized.profile || currentMapState.profile?.id || currentMapState.profile?.presetId || detected.profile || "not specified";
  const variables = normalized.enabledVariables.length ? normalized.enabledVariables.join(", ") : "none";
  const warnings = normalized.missingDataWarnings.length ? normalized.missingDataWarnings.join("; ") : "none reported";
  const poiText = normalized.poiCount === null ? "not available" : String(normalized.poiCount);
  const layerValueText = Object.keys(normalized.layerValues || {}).length
    ? Object.entries(normalized.layerValues).map(([key, value]) => `${key}=${value}`).join(", ")
    : "not available";
  const score = calculateResultScore(normalized);
  const scoreText = score === null ? "not available" : `${score}/100`;

  const relationToOriginal = buildResultOriginalQuestionNote({ agentContext });

  return [
    relationToOriginal,
    relationToOriginal ? "" : null,
    "Conclusion:",
    `- Suitability score: ${scoreText}. Overall: ${getScoreLabel(score)}.`,
    "- The score is derived from the comfort ratio of the real CAT result: comfort-adjusted catchment area divided by baseline catchment area.",
    "",
    "Profile assumptions:",
    `- Profile used: ${profile}. Walking time: ${normalized.walkingTime ?? "not available"} min. Walking speed: ${normalized.walkingSpeed ?? "not available"} km/h.`,
    "",
    "Available data used:",
    `- Enabled comfort variables: ${variables}.`,
    `- Layer values: ${layerValueText}.`,
    "",
    "Computed result:",
    `- Baseline catchment area: ${formatKnownNumber(normalized.defaultArea, " ha")}.`,
    `- Comfort-adjusted catchment area: ${normalized.hasWeightedResult ? formatKnownNumber(normalized.weightedArea, " ha") : "not computed because no comfort variables were enabled"}.`,
    `- Comfort ratio: ${formatKnownNumber(normalized.comfortRatio)}.`,
    `- POI count inside the latest computed area: ${poiText}.`,
    "",
    "Data limitations:",
    `- Missing data warnings: ${warnings}.`,
    "- This explanation only uses metadata returned by the CAT map computation. It does not infer exact physical causes unless they were explicitly calculated and included in the metadata.",
  ].filter((line) => line !== null).join("\n");
}

function buildResultOriginalQuestionNote({ agentContext }) {
  if (!agentContext?.originalUserQuestion) return "";
  const originalIntent = agentContext.originalIntent || "unknown";
  const capability = agentContext.capabilityCheck || {};
  if (capability.systemCanFullyAnswer === false || ["route_recommendation", "specific_poi_query", "unsupported_specific_poi_query"].includes(originalIntent)) {
    return [
      `Relation to original question: ${agentContext.originalUserQuestion}`,
      "This latest CAT result explains a related catchment/accessibility-area computation. It does not directly answer the original route, nearest-place, or other unsupported task. Use it as supporting context, not as the exact original answer.",
    ].join("\n");
  }
  return `Explaining latest CAT result for the previous question: ${agentContext.originalUserQuestion}`;
}

function buildReplyForRunAction(action) {
  const variables = action.enabledVariables.length ? action.enabledVariables.join(", ") : "none";
  const layerValues = Object.keys(action.layerValues || {}).length
    ? Object.entries(action.layerValues).map(([key, value]) => `${key}=${value}`).join(", ")
    : "none";
  const warnings = action.missingDataWarnings.length
    ? `\nWarnings: ${action.missingDataWarnings.join(" ")}`
    : "";
  const profileInferenceNote = action.profileInference?.isApproximation
    ? `Profile match note: ${action.profileInference.reason}`
    : "";

  if (action.requiresStartPoint) {
    return [
      `I detected the ${action.profile} profile and prepared settings for ${action.city}.`,
      profileInferenceNote,
      `Recommended walking speed: ${action.walkingSpeed} km/h. Walking time: ${action.walkingTime} min.`,
      `Recommended comfort variables: ${variables}.`,
      `Recommended weights: ${layerValues}.`,
      "Next step: please select a start point/address on the map first. After that, run the CAT analysis so the agent can explain the real computed result.",
      warnings,
    ].filter(Boolean).join("\n");
  }

  const location = action.locationText
    ? `Detected location: ${action.locationText} (${action.coordinates[0]}, ${action.coordinates[1]}).`
    : `Using the current selected start point (${action.coordinates[0]}, ${action.coordinates[1]}).`;
  return [
    `I detected the ${action.profile} profile and prepared settings for ${action.city}.`,
    profileInferenceNote,
    location,
    `Recommended walking speed: ${action.walkingSpeed} km/h. Walking time: ${action.walkingTime} min.`,
    `Recommended comfort variables: ${variables}.`,
    `Recommended weights: ${layerValues}.`,
    "Next step: review the action preview, then click Apply and run to compute the real catchment area.",
    warnings,
  ].filter(Boolean).join("\n");
}

function formatPoint(point) {
  if (!point) return "not selected";
  return `${Number(point.lat).toFixed(6)}, ${Number(point.lon).toFixed(6)}`;
}

function buildComparisonAction({ detected, referenceResolution, currentMapState = {} }) {
  const previous = referenceResolution.previousAnalysis;
  const currentPoint = referenceResolution.currentStartPoint;
  const currentAnalysis = referenceResolution.currentPointAnalysis;

  if (!previous) {
    return {
      type: "ASK_FOR_PREVIOUS_RESULT",
      city: detected.city,
      reason: "Comparison requires at least one previous CAT analysis result.",
    };
  }

  if (!currentPoint) {
    return {
      type: "ASK_FOR_LOCATION",
      city: previous.city || detected.city,
      profile: previous.profile || detected.profile || null,
      baseAnalysisId: previous.id,
      reason: "Comparison requires a current selected start point.",
    };
  }

  if (referenceResolution.currentSameAsPrevious) {
    return {
      type: "ASK_FOR_LOCATION",
      city: previous.city || detected.city,
      profile: previous.profile || detected.profile || null,
      baseAnalysisId: previous.id,
      reason: "The current selected point is the same as the latest analysis point. Select a new point to compare.",
    };
  }

  if (currentAnalysis) {
    return {
      type: "COMPARE_EXISTING_RESULTS",
      city: currentAnalysis.city || previous.city || detected.city,
      profile: currentAnalysis.profile || previous.profile || detected.profile || null,
      baseAnalysisId: previous.id,
      currentAnalysisId: currentAnalysis.id,
      comparison: buildAnalysisComparison({ previousAnalysis: previous, currentAnalysis }),
    };
  }

  const settings = previous.settings || {};
  const variables = settings.variables || settings.layerValues || previous.adjusted?.values || {};
  return {
    type: "RUN_ANALYSIS_THEN_COMPARE",
    baseAnalysisId: previous.id,
    useSameSettingsAs: previous.id,
    settingsSource: "previous_analysis",
    targetPoint: currentPoint,
    coordinates: [currentPoint.lon, currentPoint.lat],
    city: previous.city || detected.city,
    profile: previous.profile || detected.profile || "default_adult",
    walkingTime: Number(settings.walkingTime || previous.walkingTime || currentMapState?.walkingTime || 15),
    walkingSpeed: Number(settings.walkingSpeed || previous.walkingSpeed || currentMapState?.walkingSpeed || 5),
    enabledVariables: Array.isArray(settings.enabledVariables)
      ? settings.enabledVariables
      : Object.keys(variables || {}),
    layerValues: variables || {},
    afterRun: {
      type: "COMPARE_WITH_BASE_ANALYSIS",
      baseAnalysisId: previous.id,
    },
    requiresStartPoint: false,
    canRunNow: true,
    nextStep: "apply_same_settings_run_then_compare",
    missingDataWarnings: [],
  };
}

function buildComparisonReply({ action, referenceResolution }) {
  const previous = referenceResolution.previousAnalysis;
  const currentPoint = referenceResolution.currentStartPoint;

  if (action.type === "ASK_FOR_PREVIOUS_RESULT") {
    return "我还没有可以对比的上一轮 CAT 分析结果。请先选择一个地点并运行一次可达性分析，然后我就可以记住这次结果用于后续比较。";
  }

  if (action.type === "ASK_FOR_LOCATION") {
    if (referenceResolution.currentSameAsPrevious) {
      return "我找到了刚刚的分析结果，但当前选择的起点和刚刚的位置相同。请先在地图上选择一个新的起点，然后我可以沿用刚刚的设置运行分析并比较。";
    }
    return "我可以对比刚刚的分析结果，但你需要先在地图上选择一个新的起点。选择后再问“和刚刚比呢”，我会沿用上一轮设置来判断是否需要先运行当前点分析。";
  }

  if (action.type === "RUN_ANALYSIS_THEN_COMPARE") {
    return [
      "我理解你想比较当前选择的新地点和刚刚的分析结果。",
      `刚刚的位置已有计算结果：${formatPoint(previous?.startPoint)}。当前新地点已选择：${formatPoint(currentPoint)}，但还没有用同一套 profile 和参数运行 CAT 分析，所以现在不能公平比较。`,
      "",
      "我可以沿用刚刚的设置，对当前地点运行一次可达性分析，然后再比较两个地点：comfort ratio、舒适可达面积、POI 数量，以及哪个更适合当前 profile 的步行/活动。",
      "请点击 action 按钮运行当前地点分析；运行完成后我会基于两个 analysis records 输出比较结论。",
    ].join("\n");
  }

  if (action.type === "COMPARE_EXISTING_RESULTS") {
    const comparison = action.comparison || {};
    return [
      comparison.conclusion || "两个地点已有 CAT 结果，可以进行比较。",
      "",
      "主要依据：",
      `- Comfort ratio：刚刚的位置 ${formatKnownNumber(comparison.previousRatio)}；当前地点 ${formatKnownNumber(comparison.currentRatio)}。`,
      `- 舒适可达面积：刚刚的位置 ${formatKnownNumber(comparison.previousArea, " ha")}；当前地点 ${formatKnownNumber(comparison.currentArea, " ha")}。`,
      `- POI 数量：刚刚的位置 ${comparison.previousPoi ?? "not available"}；当前地点 ${comparison.currentPoi ?? "not available"}。`,
      "",
      "注意：这个比较只基于当前 CAT 计算结果，不代表实时路况、天气、施工或个人健康状况。",
    ].join("\n");
  }

  return "I need previous analysis history and the current selected point to compare CAT results.";
}

export async function buildAgentChatResponse({ message, city = "hamburg", currentMapState = {}, resultMetadata = null, agentContext = null, conversationHistory = [], analysisHistory = [] }) {
  let detected = understandAgentQuery(message, { city, hasResultMetadata: hasUsableResultMetadata(resultMetadata) });
  let intentRouterDebug = null;
  if (detected.queryUnderstanding?.needsLlmRouting) {
    try {
      const routerResult = await maybeClassifyIntentWithLlm({ message, detected });
      if (routerResult) {
        intentRouterDebug = routerResult.llmDebug || null;
        detected = applyLlmRoutingToDetected(detected, routerResult, message);
      }
    } catch (error) {
      intentRouterDebug = {
        provider: "bigmodel",
        error: error.message,
        fallback: "deterministic_intent_router",
      };
    }
  }
  if (!allowedIntents.has(detected.intent)) detected.intent = "general_question";
  if (!allowedCities.has(detected.city)) detected.city = cityLayerConfig[city] ? city : "hamburg";
  const referenceResolution = resolveAnalysisReferences({
    message,
    analysisHistory,
    currentMapState,
  });
  const canPromoteToFollowUpComparison = [
    "compare_with_previous_result",
    "compare_current_with_previous",
    "compare_two_locations",
    "follow_up_question",
    "explain_result",
    "general_question",
  ].includes(detected.intent);
  if (referenceResolution.isFollowUpComparison && canPromoteToFollowUpComparison) {
    detected.intent = "compare_with_previous_result";
    detected.isFollowUp = true;
    detected.referenceTarget = "latest_analysis_result";
    detected.currentTarget = "current_selected_start_point";
    detected.requiresComparison = true;
  }
  const capabilityCheck = checkAgentCapability({ intent: detected.intent, detected });

  if (shouldUseFastActionPath({ detected, capabilityCheck, resultMetadata })) {
    const action = await buildRunAction({ detected, currentMapState });
    const reply = buildReplyForRunAction(action);
    const retrieval = buildFastPathRetrieval({ detected, action });
    const citations = retrieval.results.map(toCitation);
    const ragSufficiency = evaluateRagSufficiency({
      detected,
      retrieval,
      capabilityCheck,
      resultMetadata,
    });
    const answerMode = selectAnswerMode({
      detected,
      action,
      alternativeAction: null,
      capabilityCheck,
      ragSufficiency,
    });
    const groundingCheck = runFinalGroundingCheck({
      message,
      reply,
      detected,
      action,
      alternativeAction: null,
      capabilityCheck,
      answerMode,
      agentContext,
    });
    const validationErrors = validateAgentAction(action);
    if (validationErrors.length) {
      return safeFallback({ detected, citations, retrieval, errors: validationErrors });
    }

    return {
      reply: repairUngroundedReply({ reply, groundingCheck, capabilityCheck }),
      intent: detected.intent,
      answerMode,
      detected,
      action,
      alternativeAction: null,
      capabilityCheck,
      ragSufficiency,
      groundingCheck,
      missingDataWarnings: action.missingDataWarnings || [],
      citations,
      retrieval,
      debug: {
        fastPath: true,
        detectedIntent: detected.intent,
        detectedCity: detected.city,
        detectedProfile: detected.profile,
        detectedLocationText: detected.locationText,
        capabilityCheck,
        ragSufficiency,
        groundingCheck,
        answerMode,
        originalAgentContext: agentContext,
        conversationHistoryLength: Array.isArray(conversationHistory) ? conversationHistory.length : 0,
        analysisHistoryLength: referenceResolution.analysisHistoryLength,
        referenceResolution: {
          previousAnalysisFound: referenceResolution.previousAnalysisFound,
          currentStartPointFound: referenceResolution.currentStartPointFound,
          currentPointAlreadyAnalyzed: referenceResolution.currentPointAlreadyAnalyzed,
          currentSameAsPrevious: referenceResolution.currentSameAsPrevious,
          latestAnalysisId: referenceResolution.previousAnalysis?.id || null,
          currentAnalysisId: referenceResolution.currentPointAnalysis?.id || null,
        },
        profileInference: detected.profileInference,
        detectionMethod: detected.method,
        confidence: detected.confidence,
        intentRouter: intentRouterDebug,
        llm: {
          skipped: true,
          reason: "fast_action_path",
        },
      },
    };
  }

  const resultVariables = detected.intent === "explain_result" ? getResultMetadataVariables(resultMetadata) : [];
  const retrievalQuery = resultVariables.length ? `${message} ${resultVariables.join(" ")}` : message;

  let retrieval = await retrieveKnowledge({
    query: retrievalQuery,
    intent: detected.intent,
    city: detected.city,
    profile: detected.profile || currentMapState.profile?.id || currentMapState.profile?.presetId,
    variable_key: detected.variable_key,
    collections: detected.retrievalPlan?.collections,
    topK: 5,
  });

  if (capabilityCheck.shouldRunDirectAction && !detected.profile) {
    const inferred = inferProfileFromRetrievedKnowledge({ message, retrieval });
    if (inferred.profile) {
      detected.profile = inferred.profile;
      detected.profileInference = inferred;
      retrieval = await retrieveKnowledge({
        query: retrievalQuery,
        intent: detected.intent,
        city: detected.city,
        profile: inferred.profile,
        variable_key: detected.variable_key,
        collections: detected.retrievalPlan?.collections,
        topK: 5,
      });
    }
  }

  const citations = retrieval.results.map(toCitation);
  const ragSufficiency = evaluateRagSufficiency({
    detected,
    retrieval,
    capabilityCheck,
    resultMetadata,
  });
  let action;
  let alternativeAction = null;
  let reply;

  if (detected.intent === "compare_with_previous_result") {
    action = buildComparisonAction({ detected, referenceResolution, currentMapState });
    reply = buildComparisonReply({ action, referenceResolution });
  } else if (capabilityCheck.shouldRunDirectAction) {
    action = await buildRunAction({ detected, currentMapState });
    reply = buildReplyForRunAction(action);
  } else {
    action = {
      type: "ANSWER_ONLY",
      profile: detected.profile || currentMapState.profile?.id || currentMapState.profile?.presetId || null,
      city: detected.city,
      locationText: detected.locationText,
    };
    alternativeAction = await buildAlternativeAction({ detected, currentMapState, capabilityCheck });
    reply = detected.intent === "explain_result"
      ? buildResultExplanation({ resultMetadata, detected, currentMapState, agentContext })
      : buildKnowledgeReply({ detected, retrieval, capabilityCheck });
  }

  let llmDebug = null;
  if (!["specific_poi_query", "unsupported_specific_poi_query", "route_recommendation", "compare_with_previous_result", "explain_result"].includes(detected.intent)) {
    try {
      const llmResult = await maybeBuildLlmAgentResponse({
        message,
        detected,
        retrieval,
        baselineAction: action,
        baselineReply: reply,
        currentMapState,
        resultMetadata,
        agentContext,
        conversationHistory,
        analysisHistory,
      });
      if (llmResult) {
        reply = llmResult.reply;
        detected.intent = llmResult.intent;
        action = llmResult.action;
        action.missingDataWarnings = llmResult.missingDataWarnings || action.missingDataWarnings || [];
        llmDebug = llmResult.llmDebug;
      }
    } catch (error) {
      llmDebug = {
        provider: "bigmodel",
        error: error.message,
        fallback: "mock_pipeline",
      };
    }
  }

  const answerMode = selectAnswerMode({
    detected,
    action,
    alternativeAction,
    capabilityCheck,
    ragSufficiency,
  });
  const groundingCheck = runFinalGroundingCheck({
    message,
    reply,
    detected,
    action,
    alternativeAction,
    capabilityCheck,
    answerMode,
    agentContext,
  });
  reply = repairUngroundedReply({ reply, groundingCheck, capabilityCheck });

  const validationErrors = validateAgentAction(action);
  if (validationErrors.length) {
    return safeFallback({ detected, citations, retrieval, errors: validationErrors });
  }

  const replyValidationErrors = validateAgentReply(reply);
  if (replyValidationErrors.length) {
    return safeFallback({ detected, citations, retrieval, errors: replyValidationErrors });
  }

  return {
    reply,
    intent: detected.intent,
    answerMode,
    detected,
    action,
    alternativeAction,
    capabilityCheck,
    ragSufficiency,
    groundingCheck,
    missingDataWarnings: action.missingDataWarnings || [],
    citations,
    retrieval: {
      source: retrieval.source,
      collectionsSearched: retrieval.collections,
      rerank: retrieval.rerank,
      results: retrieval.results,
    },
    debug: {
      detectedIntent: detected.intent,
      detectedCity: detected.city,
      detectedProfile: detected.profile,
      detectedLocationText: detected.locationText,
      detectedDestinationText: detected.destinationText,
      capabilityCheck,
      ragSufficiency,
      groundingCheck,
      answerMode,
      originalAgentContext: agentContext,
      conversationHistoryLength: Array.isArray(conversationHistory) ? conversationHistory.length : 0,
      analysisHistoryLength: referenceResolution.analysisHistoryLength,
      referenceResolution: {
        previousAnalysisFound: referenceResolution.previousAnalysisFound,
        currentStartPointFound: referenceResolution.currentStartPointFound,
        currentPointAlreadyAnalyzed: referenceResolution.currentPointAlreadyAnalyzed,
        currentSameAsPrevious: referenceResolution.currentSameAsPrevious,
        latestAnalysisId: referenceResolution.previousAnalysis?.id || null,
        currentAnalysisId: referenceResolution.currentPointAnalysis?.id || null,
      },
      profileInference: detected.profileInference,
      detectionMethod: detected.method,
      confidence: detected.confidence,
      intentRouter: intentRouterDebug,
      llm: llmDebug,
    },
  };
}
