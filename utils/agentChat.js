import { cityLayerConfig } from "../components/cityVariableConfig.js";
import { getProfilePreset } from "../components/agent/profilePresets.js";
import { detectAgentRequest } from "./agentIntent.js";
import { retrieveKnowledge } from "./agentKnowledge.js";
import { filterVariablesByCity } from "./cityVariableFiltering.js";
import { geocodeLocation } from "./agentGeocode.js";
import { maybeBuildLlmAgentResponse } from "./agentLlm.js";
import {
  SAFE_CITIES,
  SAFE_INTENTS,
  safeFallback,
  validateAgentAction,
  validateAgentReply,
} from "./agentSafety.js";

const allowedCities = SAFE_CITIES;
const allowedIntents = SAFE_INTENTS;

function hasUsableResultMetadata(resultMetadata) {
  if (Array.isArray(resultMetadata)) return resultMetadata.length > 0;
  return Boolean(resultMetadata && typeof resultMetadata === "object" && Object.keys(resultMetadata).length > 0);
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

function buildKnowledgeReply({ detected, retrieval }) {
  const top = retrieval.results[0];
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

async function buildRunAction({ detected, currentMapState = {} }) {
  const preset = getProfilePreset(detected.profile || "default_adult") || getProfilePreset("default_adult");
  const cityFiltered = filterVariablesByCity({
    city: detected.city,
    enabledVariables: preset.enabledVariables,
    layerValues: preset.layerValues,
    requestedVariables: [detected.variable_key],
  });
  const geocoded = detected.locationText
    ? await geocodeLocation({ locationText: detected.locationText, city: detected.city })
    : null;
  const hasCoordinates = Array.isArray(geocoded?.coordinates) &&
    geocoded.coordinates.length === 2 &&
    geocoded.coordinates.every((value) => Number.isFinite(Number(value)));
  const hasCurrentStartPoint = Array.isArray(currentMapState.startPoint) &&
    currentMapState.startPoint.length === 2 &&
    currentMapState.startPoint.every((value) => Number.isFinite(Number(value)));
  const coordinates = hasCoordinates
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

function buildResultExplanation({ resultMetadata, detected, currentMapState = {} }) {
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

  return [
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
  ].join("\n");
}

function buildReplyForRunAction(action) {
  const variables = action.enabledVariables.length ? action.enabledVariables.join(", ") : "none";
  const layerValues = Object.keys(action.layerValues || {}).length
    ? Object.entries(action.layerValues).map(([key, value]) => `${key}=${value}`).join(", ")
    : "none";
  const warnings = action.missingDataWarnings.length
    ? `\nWarnings: ${action.missingDataWarnings.join(" ")}`
    : "";

  if (action.requiresStartPoint) {
    return [
      `I detected the ${action.profile} profile and prepared settings for ${action.city}.`,
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
    location,
    `Recommended walking speed: ${action.walkingSpeed} km/h. Walking time: ${action.walkingTime} min.`,
    `Recommended comfort variables: ${variables}.`,
    `Recommended weights: ${layerValues}.`,
    "Next step: review the action preview, then click Apply and run to compute the real catchment area.",
    warnings,
  ].filter(Boolean).join("\n");
}

export async function buildAgentChatResponse({ message, city = "hamburg", currentMapState = {}, resultMetadata = null }) {
  const detected = detectAgentRequest(message, { city, hasResultMetadata: hasUsableResultMetadata(resultMetadata) });
  if (!allowedIntents.has(detected.intent)) detected.intent = "general_question";
  if (!allowedCities.has(detected.city)) detected.city = cityLayerConfig[city] ? city : "hamburg";
  const resultVariables = detected.intent === "explain_result" ? getResultMetadataVariables(resultMetadata) : [];
  const retrievalQuery = resultVariables.length ? `${message} ${resultVariables.join(" ")}` : message;

  const retrieval = await retrieveKnowledge({
    query: retrievalQuery,
    intent: detected.intent,
    city: detected.city,
    profile: detected.profile || currentMapState.profile?.id || currentMapState.profile?.presetId,
    variable_key: detected.variable_key,
    topK: 5,
  });

  const citations = retrieval.results.map(toCitation);
  let action;
  let reply;

  if (detected.intent === "run_accessibility_analysis") {
    action = await buildRunAction({ detected, currentMapState });
    reply = buildReplyForRunAction(action);
  } else {
    action = {
      type: "ANSWER_ONLY",
      profile: detected.profile || currentMapState.profile?.id || currentMapState.profile?.presetId || null,
      city: detected.city,
      locationText: detected.locationText,
    };
    reply = detected.intent === "explain_result"
      ? buildResultExplanation({ resultMetadata, detected, currentMapState })
      : buildKnowledgeReply({ detected, retrieval });
  }

  let llmDebug = null;
  try {
    const llmResult = await maybeBuildLlmAgentResponse({
      message,
      detected,
      retrieval,
      baselineAction: action,
      baselineReply: reply,
      currentMapState,
      resultMetadata,
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
    detected,
    action,
    missingDataWarnings: action.missingDataWarnings || [],
    citations,
    retrieval: {
      source: retrieval.source,
      collectionsSearched: retrieval.collections,
      results: retrieval.results,
    },
    debug: {
      detectedIntent: detected.intent,
      detectedCity: detected.city,
      detectedProfile: detected.profile,
      detectedLocationText: detected.locationText,
      detectionMethod: detected.method,
      confidence: detected.confidence,
      llm: llmDebug,
    },
  };
}
