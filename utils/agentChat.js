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
  normalizeAnalysisHistory,
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

function isFastHowToQuestion(message, detected) {
  if (detected?.intent !== "how_to_use") return false;
  const text = String(message || "").toLowerCase();
  return /what can .*tool.*do|what.*tool.*do|what.*assistant.*do|tool.*capabilit|before i start|how.*use|use.*cat|用途|有什么用|可以做什么|能做什么|怎么用|如何使用/u.test(text);
}

function buildFastHowToResponse({ language = "en" } = {}) {
  if (language === "zh") {
    return [
      "CAT 用来比较一个或多个起点周边的步行可达范围，并说明你关心的环境因素会如何影响步行舒适程度。",
      "",
      "你可以先在地图上选择候选地点，再选择对你重要的环境因素，并设置它们对你的影响程度，然后运行分析。预设只是一种快速起点，不代表每个人；你随时可以按自己的感受继续调整。我也可以帮你解释结果，或比较多个候选地点哪一个受这些因素影响更小。",
    ].join("\n");
  }
  return [
    "CAT compares comfort-based walking accessibility around one or more selected start points.",
    "",
    "Pick candidate places on the map, choose the comfort factors that matter to you, set how much each one affects your comfort, and run the analysis. You can also use a pre-set profile as a shortcut for typical settings. I can then show how factors like stairs, slopes, uneven surfaces and high kerbs affect each place, and compare which option is less restricted.",
  ].join("\n");
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

function buildCitywideRecommendationReply({ detected }) {
  const city = detected.city || "hamburg";
  const profile = detected.profile || null;
  const language = detected.responseLanguage || detected.language || "en";
  const profileLabel = getActionProfileLabel(profile || "default_adult", language);
  const settingsText = profile
    ? `settings based on ${profileLabel}`
    : "a chosen set of comfort-factor impact levels";

  if (language === "de") {
    return [
      `Ich kann nicht direkt beantworten, welcher Ort in ${city} am besten zum Spazierengehen oder für Aktivitäten geeignet ist. CAT ist kein Stadtführer, kein POI-Ranking und kein Tool für direkte Gebietsempfehlungen.`,
      "",
      `CAT kann stattdessen mehrere von dir ausgewählte Startpunkte oder Kandidatengebiete vergleichen. Ich kann Einstellungen für ${profileLabel} vorbereiten und danach erreichbare Fläche, Komfortverhältnis und Einschränkungen vergleichen.`,
      "",
      "Nächster Schritt: Wähle auf der Karte einen Kandidatenpunkt aus. Wenn du 2-3 Orte vergleichen möchtest, führe die Analyse für jeden Punkt aus und frage mich danach nach dem Vergleich.",
    ].join("\n");
  }

  if (language === "zh") {
    return [
      `我不能直接回答“${city} 哪里最适合散步/活动”这类全城场地推荐问题。CAT 不是城市景点推荐、POI 排名或最佳区域推荐工具，也不会直接给出某个场地作为结论。`,
      "",
      `它更适合做的是：你先选择一个或多个候选起点/区域，我可以根据${profileLabel}以及你关心的环境因素来准备设置；这些设置只是快速起点，可以继续按你的舒适程度修改。然后 CAT 可以计算每个起点周边的舒适可达范围、舒适可达比例和相关限制，用来对比哪个候选点更合适。`,
      "",
      "建议下一步：你可以在地图上选择一个候选地点先分析；如果你有 2-3 个备选地点，也可以分别运行后让我帮你比较结果。对于老人散步，我会更关注台阶、坡度、路面不平、破损路面、过高路缘、障碍物、过街信号等因素。",
    ].join("\n");
  }

  return [
    `A good way to explore this in ${city} is to compare a few candidate places on the map.`,
    "",
    `Select one or more start points, then run the analysis. I can prepare ${settingsText} and compare which place is less affected by the comfort factors you care about.`,
  ].join("\n");
}

function buildKnowledgeReply({ detected, retrieval, capabilityCheck = null }) {
  const top = retrieval.results[0];
  const language = detected.responseLanguage || detected.language || "en";
  if (detected.intent === "route_recommendation") {
    const profile = detected.profile || "default_adult";
    const profileLabel = getActionProfileLabel(profile, language);
    const origin = detected.locationText || "the selected/start location";
    const destination = detected.destinationText || "the destination";
    if (language === "zh") {
      return [
        `你问的是从 ${origin} 到 ${destination} 的具体路线，尤其是“最舒适路线”。当前 CAT 不能直接计算 A 到 B 的路线、路径几何或路线排序，所以我不能把某一条路线说成答案。`,
        "",
        `和你的问题相关的是：我可以把 ${origin} 作为起点，并根据${profileLabel}准备环境因素设置。CAT 可以计算从这个起点出发的舒适可达区域，告诉你哪些区域更可能可达、环境因素会让可达范围缩小多少，但它不能等同于“到 ${destination} 的最佳路线”。`,
        "",
        `建议操作：如果你想做替代分析，可以运行从 ${origin} 出发的舒适可达区域分析；如果你需要精确路线，需要具备 origin-destination routing / least-cost routing 的地图工具。`,
        capabilityCheck?.closestSupportedAlternative
          ? `最接近的 CAT 替代操作：${capabilityCheck.closestSupportedAlternative}。`
          : "",
      ].filter(Boolean).join("\n");
    }
    if (language === "de") {
      return [
        `Du fragst nach einer konkreten Route von ${origin} nach ${destination}. CAT berechnet derzeit keine A-nach-B-Route, keine Routengeometrie und keine Rangliste einzelner Wege.`,
        "",
        `Was CAT stattdessen tun kann: Ich kann ${origin} als Startpunkt verwenden und Einstellungen fuer ${profileLabel} vorbereiten. Danach zeigt CAT den komfortbasiert erreichbaren Bereich rund um diesen Startpunkt, aber keine beste Route nach ${destination}.`,
        "",
        "Vorgeschlagener Schritt: Fuehre eine Erreichbarkeitsanalyse vom Startpunkt aus. Fuer eine genaue Route brauchst du ein Routing-Werkzeug mit origin-destination oder least-cost routing.",
        capabilityCheck?.closestSupportedAlternative
          ? `Naechste unterstuetzte CAT-Alternative: ${capabilityCheck.closestSupportedAlternative}.`
          : "",
      ].filter(Boolean).join("\n");
    }
    return [
      `You are asking for a specific route from ${origin} to ${destination}. CAT cannot currently calculate an A-to-B route, route geometry, or route ranking, so I should not present one path as the answer.`,
      "",
      `What CAT can do instead: I can use ${origin} as the start point and prepare settings for ${profileLabel}. CAT can then calculate the comfort-based reachable area from that start point, but this is not the same as finding the best route to ${destination}.`,
      "",
      "Suggested next step: run a reachable-area analysis from the start point. For an exact route, you need a map tool with origin-destination routing or least-cost routing.",
      capabilityCheck?.closestSupportedAlternative
        ? `Closest supported CAT alternative: ${capabilityCheck.closestSupportedAlternative}.`
        : "",
    ].filter(Boolean).join("\n");
  }
  if (detected.intent === "specific_poi_query" || detected.intent === "unsupported_specific_poi_query") {
    const profile = detected.profile || "default_adult";
    const profileLabel = getActionProfileLabel(profile, language);
    const locationZh = detected.locationText ? `，起点似乎是 ${detected.locationText}` : "";
    if (language === "zh") {
      return [
        "这个问题我不能直接回答“最近的是哪个具体地点/服务”。CAT 当前专注于可达性区域和舒适程度影响分析，不做具体 POI 的最近距离排序、店铺推荐或路径导航。",
        "",
        `和你的问题相关的是：我可以根据${profileLabel}${locationZh}，计算从起点出发哪些区域可达，以及这些区域受到台阶、路面、过街信号、设施等环境因素影响的程度。`,
        "",
        "建议操作：如果你想判断从当前位置步行活动大概能覆盖哪里，请运行可达区域分析；如果你需要最近的具体地点是哪一个，需要使用带 POI 排序/路线规划能力的地图或本地搜索工具。",
      ].join("\n");
    }
    if (language === "de") {
      const location = detected.locationText ? ` Der Startpunkt scheint ${detected.locationText} zu sein.` : "";
      return [
        "Diese Frage kann CAT nicht direkt als naechstgelegenen konkreten Ort oder Dienst beantworten. CAT analysiert erreichbare Bereiche und Komforteinschraenkungen, aber keine POI-Rangliste, Ladenempfehlung oder Navigation.",
        "",
        `Was dazu passt: Ich kann Einstellungen fuer ${profileLabel} vorbereiten.${location} Danach kann CAT zeigen, welche Bereiche vom Startpunkt erreichbar sind und wie stark Umweltfaktoren diese Erreichbarkeit beeinflussen.`,
        "",
        "Vorgeschlagener Schritt: Fuehre eine Erreichbarkeitsanalyse aus, wenn du wissen moechtest, welchen Bereich du komfortabel erreichen kannst. Fuer den naechsten konkreten Ort brauchst du eine lokale Suche oder ein Routing-Werkzeug.",
      ].join("\n");
    }
    const location = detected.locationText ? ` The start point seems to be ${detected.locationText}.` : "";
    return [
      "CAT cannot directly answer which exact place or service is nearest. It focuses on reachable areas and comfort constraints, not POI ranking, shop recommendations, or turn-by-turn navigation.",
      "",
      `What I can do instead: prepare settings for ${profileLabel}.${location} CAT can then show which areas are reachable from the start point and how environmental factors affect that reachability.`,
      "",
      "Suggested next step: run the reachable-area analysis if you want to understand what area can be reached comfortably. For the nearest exact place, use a local search or routing tool.",
    ].join("\n");
  }
  if (detected.intent === "citywide_place_recommendation") {
    return buildCitywideRecommendationReply({ detected });
  }
  if (detected.intent === "explain_variable" && top) {
    return top.content;
  }
  if (detected.intent === "citywide_place_recommendation") {
    const city = detected.city || "hamburg";
    const profile = detected.profile || "default_adult";
    return [
      `我不能直接回答“${city} 哪里最适合散步/活动”这类全城场地推荐问题。CAT 不是城市景点推荐、POI 排名或最佳区域推荐工具，也不会直接给出某个场地作为结论。`,
      "",
      `它更适合做的是：你先选择一个或多个候选起点/区域，我可以根据你关心的环境因素，以及这些因素对你的影响程度来准备设置；${profile} 预设只是一种快速起点。然后 CAT 可以计算每个起点周边的舒适可达范围、comfort ratio 和相关限制，用来对比哪个候选点更适合。`,
      "",
      "建议下一步：你可以在地图上选择一个候选地点先分析；如果你有 2-3 个备选地点，也可以分别运行后让我帮你比较结果。对于老人散步，我会更关注台阶、坡度、路面不平、破损路面、过高路缘、障碍物、过街信号等因素。",
    ].join("\n");
  }
  if (detected.intent === "ask_data_availability" && top) {
    return `${top.title}\n\n${top.content}`;
  }
  if (detected.intent === "how_to_use") {
    return "CAT workflow: choose a city, set walking time and walking speed, select a start point, enable the comfort factors that matter to you, set how much each one affects your comfort, then run catchment area analysis. Pre-set profiles are optional shortcuts for typical settings, not complete representations of individual users. The agent prepares checkable settings first; the frontend decides whether to apply and run them.";
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
    language: detected.language,
    responseLanguage: detected.responseLanguage,
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

  const weightedResult = [...items].reverse().find((item) => item && !item.isDefault) || null;
  const defaultResult = weightedResult?.groupIndex !== undefined
    ? [...items].reverse().find((item) => item?.isDefault && item.groupIndex === weightedResult.groupIndex) || [...items].reverse().find((item) => item?.isDefault) || null
    : [...items].reverse().find((item) => item?.isDefault) || null;
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

const resultVariableLabels = {
  en: {
    noise: "traffic noise",
    light: "street lighting",
    tree: "tree shade",
    trafficLight: "safe crossings with traffic lights",
    tactile_pavement: "tactile guidance",
    temperatureSummer: "summer heat",
    temperatureWinter: "winter cold",
    greeninf: "green space",
    blueinf: "water and blue infrastructure",
    station: "public transport access",
    wcDisabled: "accessible toilets",
    narrowRoads: "narrow sidewalks",
    ramp: "ramps",
    stair: "stairs",
    obstacle: "obstacles",
    slope: "slopes",
    unevenSurface: "uneven surfaces",
    poorPavement: "poor pavement",
    kerbsHigh: "high kerbs",
    facility: "nearby facilities",
    pedestrianFlow: "pedestrian crowding",
  },
  zh: {
    noise: "噪音",
    light: "夜间照明",
    tree: "树荫",
    trafficLight: "有信号灯的过街点",
    tactile_pavement: "盲道/触觉引导",
    temperatureSummer: "夏季热环境",
    temperatureWinter: "冬季冷环境",
    greeninf: "绿地",
    blueinf: "水体空间",
    station: "公共交通站点",
    wcDisabled: "无障碍卫生间",
    narrowRoads: "狭窄人行道",
    ramp: "坡道",
    stair: "台阶",
    obstacle: "障碍物",
    slope: "坡度",
    unevenSurface: "路面不平",
    poorPavement: "破损路面",
    kerbsHigh: "过高路缘",
    facility: "周边设施",
    pedestrianFlow: "人流密度",
  },
  de: {
    noise: "Verkehrslaerm",
    light: "Strassenbeleuchtung",
    tree: "Baumschatten",
    trafficLight: "Ampelquerungen",
    tactile_pavement: "taktiles Leitsystem",
    temperatureSummer: "Sommerhitze",
    temperatureWinter: "Winterkaelte",
    greeninf: "Gruenraum",
    blueinf: "Wassernaehe",
    station: "OePNV-Zugang",
    wcDisabled: "barrierefreie Toiletten",
    narrowRoads: "enge Gehwege",
    ramp: "Rampen",
    stair: "Treppen",
    obstacle: "Hindernisse",
    slope: "Steigungen",
    unevenSurface: "unebene Oberflaechen",
    poorPavement: "schlechter Belag",
    kerbsHigh: "hohe Bordsteine",
    facility: "nahe Einrichtungen",
    pedestrianFlow: "Fussgaengerandrang",
  },
};

function formatPlainList(items, language = "en") {
  const clean = items.filter(Boolean);
  if (!clean.length) return "";
  if (clean.length === 1) return clean[0];
  if (language === "zh") return `${clean.slice(0, -1).join("、")}和${clean[clean.length - 1]}`;
  if (language === "de") return `${clean.slice(0, -1).join(", ")} und ${clean[clean.length - 1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

function getVariableLabel(variable, language = "en") {
  const labels = resultVariableLabels[language] || resultVariableLabels.en;
  return labels[variable] || resultVariableLabels.en[variable] || String(variable || "").replace(/_/g, " ");
}

function getRestrictionSummary(normalized, language = "en") {
  if (!Number.isFinite(Number(normalized?.comfortRatio))) return "";
  const retained = clamp(Math.round(Number(normalized.comfortRatio) * 100), 0, 100);
  const affected = clamp(100 - retained, 0, 100);
  if (language === "zh") {
    if (affected >= 45) {
      return `当前设置下影响很强：普通步行条件下可达的范围中，大约 ${affected}% 会因为这些环境因素而变得不那么舒适。`;
    }
    if (affected >= 25) {
      return `当前设置下影响比较明显：普通步行条件下可达的范围中，大约 ${affected}% 会受到这些环境因素影响。`;
    }
    if (affected >= 10) {
      return `当前设置下影响中等：大部分普通可达范围仍然保留，但仍有一部分区域受到影响。`;
    }
    return "当前设置下影响较小：大多数普通可达区域在这些环境因素下仍然保留。";
  }
  if (affected >= 45) {
    return `Comfort factors have a strong impact here: roughly ${affected}% of the area that is reachable under ordinary walking assumptions becomes less suitable once those factors are considered. Many places that look reachable at first may not be comfortable to reach.`;
  }
  if (affected >= 25) {
    return `Comfort factors noticeably restrict this result: roughly ${affected}% of the ordinary reachable area is filtered out by the selected comfort assumptions, so quite a few places become less suitable to reach.`;
  }
  if (affected >= 10) {
    return `Comfort factors have a moderate impact here: most of the ordinary reachable area remains comfortable, but some places are still affected by the selected barriers.`;
  }
  return "Comfort factors have only a small impact here: most places that are ordinarily reachable remain comfortable under the selected settings.";
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

function getScoreLabel(score, language = "en") {
  if (score === null || score === undefined) return "not enough computed data";
  if (language === "zh") {
    if (score >= 75) return "这些环境因素影响较小";
    if (score >= 50) return "这些环境因素有明显影响";
    return "这些环境因素影响很强";
  }
  if (score >= 75) return "generally suitable";
  if (score >= 50) return "partly suitable with noticeable comfort constraints";
  return "limited suitability under the selected comfort assumptions";
}

function buildResultExplanation({ resultMetadata, detected, agentContext = null }) {
  const normalized = normalizeResultMetadata(resultMetadata);
  if (!normalized) {
    return buildKnowledgeReply({ detected, retrieval: { results: [] } });
  }

  const language = detected.responseLanguage || detected.language || "en";
  const variables = normalized.enabledVariables.map((variable) => getVariableLabel(variable, language));
  const score = calculateResultScore(normalized);
  const restrictionSummary = getRestrictionSummary(normalized, language);
  const servicePointText = Number.isFinite(Number(normalized.poiCount))
    ? language === "zh"
      ? normalized.hasWeightedResult
        ? `在考虑这些环境因素后，可达范围内仍大约有 ${Number(normalized.poiCount)} 个地点或服务；具体位置需要结合地图查看。`
        : `普通步行可达范围内大约有 ${Number(normalized.poiCount)} 个地点或服务，但这还没有考虑环境因素对舒适程度的影响。`
      : normalized.hasWeightedResult
        ? `There are still around ${Number(normalized.poiCount)} places or services inside the comfort-adjusted reachable area, but the map should be used to see where they are.`
        : `The ordinary reachable area includes around ${Number(normalized.poiCount)} places or services, but this does not yet account for comfort barriers.`
    : "";

  const relationToOriginal = buildResultOriginalQuestionNote({ agentContext, language });
  const contextLine = relationToOriginal
    ? relationToOriginal
    : language === "zh"
      ? "这是最新 CAT 结果的简要解释。"
      : "Here is the plain-language summary of the latest CAT result.";
  const lines = [contextLine, ""];

  if (!normalized.hasWeightedResult || variables.length === 0 || score === null) {
    lines.push(language === "zh"
      ? "这次运行显示的是从所选起点出发的普通步行可达范围，但还不能说明在你关心的环境因素下，这个区域对你是否舒适。"
      : "This run shows the ordinary walking catchment from the selected start point, but it does not yet tell us whether the area is comfortable under the factors you selected and how strongly they affect you.");
    if (servicePointText) {
      lines.push(servicePointText);
    }
    lines.push(language === "zh"
      ? "如果要判断步行舒适程度，请先应用你关心的环境因素并重新运行分析。对于老年人步行，通常需要重点看台阶、坡度、路面不平、破损路面、过高路缘和障碍物。"
      : "To answer the comfort question properly, apply the recommended comfort factors first and run the analysis again. For an older adult, the most relevant factors are usually stairs, slopes, uneven surfaces, poor pavement, high kerbs and obstacles.");
    if (normalized.missingDataWarnings.length) {
      lines.push(language === "zh"
        ? `需要注意：${normalized.missingDataWarnings.join(" ")}`
        : `One caveat: ${normalized.missingDataWarnings.join(" ")}`);
    }
    return lines.filter(Boolean).join("\n\n");
  }

  lines.push(language === "zh"
    ? `在当前环境因素设置下，舒适可达程度约为 ${score}/100，表示：${getScoreLabel(score, language)}。`
    : `Under the selected comfort settings, the comfort-adjusted reachable area is about ${score}/100 of the ordinary reachable area: ${getScoreLabel(score, language)}.`);

  if (restrictionSummary) {
    lines.push(restrictionSummary);
  }

  lines.push(language === "zh"
    ? `这次结果考虑了：${formatPlainList(variables, language)}。`
    : `This result considers ${formatPlainList(variables, language)}.`);

  if (servicePointText) {
    lines.push(servicePointText);
  }

  if (normalized.missingDataWarnings.length) {
    lines.push(language === "zh"
      ? `需要注意：${normalized.missingDataWarnings.join(" ")}`
      : `One caveat: ${normalized.missingDataWarnings.join(" ")}`);
  }

  return lines.filter(Boolean).join("\n\n");
}

function buildResultOriginalQuestionNote({ agentContext, language = "en" }) {
  if (!agentContext?.originalUserQuestion) return "";
  const originalIntent = agentContext.originalIntent || "unknown";
  const capability = agentContext.capabilityCheck || {};
  if (capability.systemCanFullyAnswer === false || ["route_recommendation", "specific_poi_query", "unsupported_specific_poi_query", "citywide_place_recommendation"].includes(originalIntent)) {
    if (language === "zh") {
      return [
        `关于你前面的问题：“${agentContext.originalUserQuestion}”`,
        "CAT 不能直接回答那个完整请求，但这个结果可以帮助你理解所选起点周边的步行可达范围。",
      ].join("\n");
    }
    return [
      `About your earlier question: "${agentContext.originalUserQuestion}"`,
      "CAT cannot directly answer that exact request, but this result can still help you understand the reachable walking area around the selected start point.",
    ].join("\n");
  }
  if (language === "zh") return `接着你前面的问题：“${agentContext.originalUserQuestion}”`;
  return `Following up on your earlier question: "${agentContext.originalUserQuestion}"`;
}

const actionProfileLabels = {
  en: {
    elderly: "older adult walking needs",
    wheelchair_user: "wheelchair mobility needs",
    visually_impaired: "visual guidance needs",
    children_family: "family or stroller walking needs",
    default_adult: "general walking needs",
  },
  zh: {
    elderly: "老年人步行需求",
    wheelchair_user: "轮椅出行需求",
    visually_impaired: "视障出行需求",
    children_family: "儿童/家庭出行需求",
    default_adult: "一般步行需求",
  },
  de: {
    elderly: "Beduerfnisse aelterer Fussgaenger",
    wheelchair_user: "Beduerfnisse von Rollstuhlnutzenden",
    visually_impaired: "Orientierungsbeduerfnisse bei Sehbeeintraechtigung",
    children_family: "Familien- oder Kinderwagenbeduerfnisse",
    default_adult: "allgemeine Gehbeduerfnisse",
  },
};

function getActionProfileLabel(profile, language = "en") {
  const labels = actionProfileLabels[language] || actionProfileLabels.en;
  return labels[profile] || actionProfileLabels.en[profile] || "your walking needs";
}

function buildImpactSummary(layerValues = {}, language = "en") {
  const groups = Object.entries(layerValues || {}).reduce((acc, [key, value]) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return acc;
    const label = getVariableLabel(key, language);
    if (numeric >= 0.75) acc.high.push(label);
    else if (numeric >= 0.45) acc.medium.push(label);
    else acc.low.push(label);
    return acc;
  }, { high: [], medium: [], low: [] });

  const lines = [];
  if (language === "zh") {
    if (groups.high.length) lines.push(`重点考虑：${formatPlainList(groups.high, language)}。`);
    if (groups.medium.length) lines.push(`也会明显影响舒适程度：${formatPlainList(groups.medium, language)}。`);
    if (groups.low.length) lines.push(`作为较轻的参考因素：${formatPlainList(groups.low, language)}。`);
    return lines;
  }
  if (groups.high.length) lines.push(`Strongest comfort factors: ${formatPlainList(groups.high, language)}.`);
  if (groups.medium.length) lines.push(`Also relevant: ${formatPlainList(groups.medium, language)}.`);
  if (groups.low.length) lines.push(`Lighter supporting factors: ${formatPlainList(groups.low, language)}.`);
  return lines;
}

function formatActionWarnings(warnings = [], language = "en") {
  if (!Array.isArray(warnings) || warnings.length === 0) return "";
  return language === "zh"
    ? `需要注意：${warnings.join(" ")}`
    : `Note: ${warnings.join(" ")}`;
}

function buildReplyForRunAction(action) {
  const language = action.responseLanguage || action.language || "en";
  const profileLabel = getActionProfileLabel(action.profile, language);
  const impactLines = buildImpactSummary(action.layerValues, language);
  const warnings = formatActionWarnings(action.missingDataWarnings, language);
  const hasLocation = Array.isArray(action.coordinates) && action.coordinates.length === 2;

  if (language === "zh") {
    const locationLine = hasLocation
      ? action.locationText
        ? `我已识别到位置：${action.locationText}。`
        : "我会使用当前地图上选择的起点。"
      : "";
    return [
      `我已根据${profileLabel}准备了一组可检查的设置。`,
      locationLine,
      `建议步行速度：${action.walkingSpeed} km/h；步行时间：${action.walkingTime} 分钟。`,
      ...impactLines,
      action.requiresStartPoint
        ? "下一步：请先在地图上选择一个起点。选择后可以运行可达性分析，我会再根据真实计算结果解释这个区域受哪些因素影响。"
        : "下一步：可以直接运行可达性分析。运行后我会根据真实计算结果解释舒适可达范围和受影响程度。",
      warnings,
    ].filter(Boolean).join("\n");
  }

  if (language === "de") {
    const locationLine = hasLocation
      ? action.locationText
        ? `Erkannter Ort: ${action.locationText}.`
        : "Ich verwende den aktuell auf der Karte gewaehlten Startpunkt."
      : "";
    return [
      `Ich habe pruefbare Einstellungen fuer ${profileLabel} vorbereitet.`,
      locationLine,
      `Gehgeschwindigkeit: ${action.walkingSpeed} km/h. Gehzeit: ${action.walkingTime} Minuten.`,
      ...impactLines,
      action.requiresStartPoint
        ? "Naechster Schritt: Waehle zuerst einen Startpunkt auf der Karte. Danach kann die Erreichbarkeitsanalyse laufen."
        : "Naechster Schritt: Starte die Erreichbarkeitsanalyse. Danach kann ich das berechnete Ergebnis erklaeren.",
      warnings,
    ].filter(Boolean).join("\n");
  }

  const locationLine = hasLocation
    ? action.locationText
      ? `Detected place: ${action.locationText}.`
      : "I will use the current start point on the map."
    : "";
  return [
    `I prepared checkable settings for ${profileLabel}.`,
    locationLine,
    `Walking speed: ${action.walkingSpeed} km/h. Walking time: ${action.walkingTime} minutes.`,
    ...impactLines,
    action.requiresStartPoint
      ? "Next step: choose a start point on the map. After that, run the accessibility analysis and I can explain the computed result."
      : "Next step: run the accessibility analysis. After it finishes, I can explain the reachable area and how strongly the comfort factors affected it.",
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
      responseLanguage: detected.responseLanguage || detected.language || "en",
      reason: "Comparison requires at least one previous CAT analysis result.",
    };
  }

  if (!currentPoint) {
    return {
      type: "ASK_FOR_LOCATION",
      city: previous.city || detected.city,
      profile: previous.profile || detected.profile || null,
      baseAnalysisId: previous.id,
      responseLanguage: detected.responseLanguage || detected.language || "en",
      reason: "Comparison requires a current selected start point.",
    };
  }

  if (referenceResolution.currentSameAsPrevious) {
    return {
      type: "ASK_FOR_LOCATION",
      city: previous.city || detected.city,
      profile: previous.profile || detected.profile || null,
      baseAnalysisId: previous.id,
      responseLanguage: detected.responseLanguage || detected.language || "en",
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
      responseLanguage: detected.responseLanguage || detected.language || "en",
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
    responseLanguage: detected.responseLanguage || detected.language || "en",
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
  const language = action.responseLanguage || "en";

  if (action.type === "ASK_FOR_PREVIOUS_RESULT") {
    if (language === "zh") {
      return "我还没有可以对比的上一轮 CAT 分析结果。请先选择一个地点并运行一次可达性分析，然后我就可以记住这次结果用于后续比较。";
    }
    if (language === "de") {
      return "Ich habe noch kein frueheres CAT-Ergebnis zum Vergleichen. Waehle zuerst einen Ort aus und fuehre eine Erreichbarkeitsanalyse aus; danach kann ich dieses Ergebnis fuer den Vergleich verwenden.";
    }
    return "I do not have a previous CAT analysis result to compare yet. Choose a place and run one accessibility analysis first; then I can remember that result for comparison.";
  }

  if (action.type === "ASK_FOR_LOCATION") {
    if (language === "zh") {
      if (referenceResolution.currentSameAsPrevious) {
        return "我找到了刚刚的分析结果，但当前选择的起点和刚刚的位置相同。请先在地图上选择一个新的起点，然后我可以沿用刚刚的设置运行分析并比较。";
      }
      return "我可以对比刚刚的分析结果，但你需要先在地图上选择一个新的起点。选择后再问“和刚刚比呢”，我会沿用上一轮设置来判断是否需要先运行当前点分析。";
    }
    if (language === "de") {
      if (referenceResolution.currentSameAsPrevious) {
        return "Ich habe das vorherige Analyseergebnis gefunden, aber der aktuell gewaehlte Startpunkt ist derselbe. Waehle bitte zuerst einen neuen Startpunkt auf der Karte; danach kann ich mit denselben Komforteinstellungen analysieren und vergleichen.";
      }
      return "Ich kann das vorherige Ergebnis vergleichen, brauche dafuer aber zuerst einen neuen Startpunkt auf der Karte. Danach kann ich mit denselben Einstellungen pruefen, ob fuer den neuen Punkt zuerst eine Analyse laufen muss.";
    }
    if (referenceResolution.currentSameAsPrevious) {
      return "I found the previous analysis result, but the currently selected start point is the same place. Please choose a new start point on the map; then I can reuse the same comfort settings, run the analysis, and compare the two places.";
    }
    return "I can compare against the previous analysis result, but I first need a new start point on the map. After you select it, I can reuse the previous settings and check whether the new point needs to be analysed before comparing.";
  }

  if (action.type === "RUN_ANALYSIS_THEN_COMPARE") {
    if (language === "zh") {
      return [
        "我理解你想比较当前选择的新地点和刚刚的分析结果。",
        `刚刚的位置已有计算结果：${formatPoint(previous?.startPoint)}。当前新地点已选择：${formatPoint(currentPoint)}，但还没有用同一套环境因素设置运行 CAT 分析，所以现在不能公平比较。`,
        "",
        "我可以沿用刚刚的设置，对当前地点运行一次可达性分析，然后再比较两个地点的舒适可达比例、舒适可达面积、地点/服务数量，以及哪个更符合你当前的步行需求。",
        "请点击运行分析；运行完成后我会基于两个结果给出比较结论。",
      ].join("\n");
    }
    if (language === "de") {
      return [
        "Ich verstehe, dass du den neu gewaehlten Ort mit dem vorherigen Analyseergebnis vergleichen moechtest.",
        `Fuer den vorherigen Ort gibt es bereits ein Ergebnis: ${formatPoint(previous?.startPoint)}. Der neue Ort ist ausgewaehlt: ${formatPoint(currentPoint)}. Fuer einen fairen Vergleich muss CAT dort aber noch mit denselben Komforteinstellungen laufen.`,
        "",
        "Ich kann die vorherigen Einstellungen uebernehmen, die Erreichbarkeitsanalyse fuer den aktuellen Ort starten und danach beide Orte vergleichen: Komfortanteil, komfortabel erreichbare Flaeche, Anzahl erreichbarer Orte/Dienste und welche Option besser zu deinen Gehbeduerfnissen passt.",
        "Bitte starte die Analyse; danach gebe ich dir den Vergleich der beiden Ergebnisse.",
      ].join("\n");
    }
    return [
      "I understand that you want to compare the newly selected place with the previous analysis result.",
      `The previous place already has a computed result: ${formatPoint(previous?.startPoint)}. The new place is selected: ${formatPoint(currentPoint)}, but CAT has not yet run there with the same comfort settings, so a fair comparison is not possible yet.`,
      "",
      "I can reuse the previous settings, run the accessibility analysis for the current place, and then compare the two places by comfort share, comfort-adjusted reachable area, reachable places/services, and which option better fits your walking needs.",
      "Please run the analysis; after it finishes, I will compare the two results.",
    ].join("\n");
  }

  if (action.type === "COMPARE_EXISTING_RESULTS") {
    const comparison = action.comparison || {};
    if (language === "zh") {
      return [
        comparison.conclusion || "两个地点已有 CAT 结果，可以进行比较。",
        "",
        "主要依据：",
        `- 舒适可达比例：刚刚的位置 ${formatKnownNumber(comparison.previousRatio)}；当前地点 ${formatKnownNumber(comparison.currentRatio)}。`,
        `- 舒适可达面积：刚刚的位置 ${formatKnownNumber(comparison.previousArea, " ha")}；当前地点 ${formatKnownNumber(comparison.currentArea, " ha")}。`,
        `- 地点/服务数量：刚刚的位置 ${comparison.previousPoi ?? "not available"}；当前地点 ${comparison.currentPoi ?? "not available"}。`,
        "",
        "注意：这个比较只基于当前 CAT 计算结果，不代表实时路况、天气、施工或个人健康状况。",
      ].join("\n");
    }
    if (language === "de") {
      return [
        "Fuer beide Orte liegen CAT-Ergebnisse vor, deshalb kann ich sie vergleichen.",
        "",
        "Wichtigste Grundlage:",
        `- Komfortanteil: vorheriger Ort ${formatKnownNumber(comparison.previousRatio)}; aktueller Ort ${formatKnownNumber(comparison.currentRatio)}.`,
        `- Komfortabel erreichbare Flaeche: vorheriger Ort ${formatKnownNumber(comparison.previousArea, " ha")}; aktueller Ort ${formatKnownNumber(comparison.currentArea, " ha")}.`,
        `- Anzahl Orte/Dienste: vorheriger Ort ${comparison.previousPoi ?? "not available"}; aktueller Ort ${comparison.currentPoi ?? "not available"}.`,
        "",
        "Hinweis: Dieser Vergleich basiert nur auf den aktuellen CAT-Ergebnissen. Er ersetzt keine Echtzeitinformationen zu Verkehr, Wetter, Baustellen oder persoenlicher Gesundheit.",
      ].join("\n");
    }
    return [
      "Both places have completed CAT results, so I can compare them.",
      "",
      "Main evidence:",
      `- Comfort share: previous place ${formatKnownNumber(comparison.previousRatio)}; current place ${formatKnownNumber(comparison.currentRatio)}.`,
      `- Comfort-adjusted reachable area: previous place ${formatKnownNumber(comparison.previousArea, " ha")}; current place ${formatKnownNumber(comparison.currentArea, " ha")}.`,
      `- Reachable places/services: previous place ${comparison.previousPoi ?? "not available"}; current place ${comparison.currentPoi ?? "not available"}.`,
      "",
      "Note: this comparison is based only on the current CAT results. It does not represent live traffic, weather, construction, or personal health conditions.",
    ].join("\n");
  }

  return "I need previous analysis history and the current selected point to compare CAT results.";
}

function buildMultiAnalysisComparisonReply({ analysisHistory = [], language = "en" } = {}) {
  const records = normalizeAnalysisHistory(analysisHistory)
    .filter((record) => record?.adjusted?.comfortRatio !== null && record?.adjusted?.comfortRatio !== undefined)
    .slice(-8);
  if (records.length < 2) {
    if (language === "zh") return "我需要至少两个已经完成的、考虑环境因素后的 CAT 结果，才能比较这些候选地点。";
    if (language === "de") return "Ich brauche mindestens zwei abgeschlossene komfortbasierte CAT-Ergebnisse, bevor ich die ausgewaehlten Orte vergleichen kann.";
    return "I need at least two completed comfort-adjusted CAT results before I can compare the selected places.";
  }

  const ranked = [...records].sort((a, b) => Number(b.adjusted.comfortRatio) - Number(a.adjusted.comfortRatio));
  const best = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const describeRecord = (record, index) => {
    const ratio = Math.round(Number(record.adjusted.comfortRatio) * 100);
    const affected = clamp(100 - ratio, 0, 100);
    const label = record.startPoint?.label || (
      language === "zh"
        ? `候选起点 ${index + 1}`
        : language === "de"
          ? `ausgewaehlter Startpunkt ${index + 1}`
          : `selected point ${index + 1}`
    );
    if (language === "zh") {
      return `${label}：舒适可达程度约为 ${ratio}/100，普通可达范围中大约 ${affected}% 会受到当前环境因素影响。`;
    }
    if (language === "de") {
      return `${label}: etwa ${ratio}/100 Komfortwert; ungefaehr ${affected}% der normalen erreichbaren Flaeche wird durch die gewaehlten Komfortfaktoren eingeschraenkt.`;
    }
    return `${label}: about ${ratio}/100 comfort score, with roughly ${affected}% of the ordinary reachable area affected by the selected comfort factors.`;
  };

  if (language === "zh") {
    return [
      `我已用同一套环境因素设置比较了 ${records.length} 个已选起点。`,
      "",
      `当前表现最好的是 ${best.startPoint?.label || "舒适可达程度最高的起点"}：在这些因素下，它保留了最多舒适可达范围。`,
      `限制最明显的是 ${weakest.startPoint?.label || "舒适可达程度最低的起点"}：考虑环境因素后，更多原本可达的地方变得不太适合。`,
      "",
      "比较详情：",
      ...ranked.map(describeRecord),
      "",
      "这个比较只用于候选起点之间的舒适可达性判断；它不会选择单一路线或具体目的地。",
    ].join("\n");
  }

  if (language === "de") {
    return [
      `Ich habe ${records.length} ausgewaehlte Startpunkte mit denselben Komforteinstellungen verglichen.`,
      "",
      `Die staerkste Option ist ${best.startPoint?.label || "der Startpunkt mit dem besten Komfortwert"}: Dort bleibt unter den gewaehlten Annahmen der groesste komfortabel erreichbare Anteil erhalten.`,
      `Am staerksten eingeschraenkt ist ${weakest.startPoint?.label || "der Startpunkt mit dem niedrigsten Komfortwert"}: Dort werden mehr normal erreichbare Orte nach den Komfortfaktoren weniger geeignet.`,
      "",
      "Vergleichsdetails:",
      ...ranked.map(describeRecord),
      "",
      "Nutze dies als komfortbasierten Vergleich zwischen Kandidatenbereichen. Es waehlt keine einzelne Route und kein exaktes Ziel aus.",
    ].join("\n");
  }

  return [
    `I compared ${records.length} selected start points using the same CAT comfort settings.`,
    "",
    `The strongest option is ${best.startPoint?.label || "the best-scoring selected point"}: it keeps the largest share of comfortable reachable places under the selected assumptions.`,
    `The most restricted option is ${weakest.startPoint?.label || "the lowest-scoring selected point"}: more originally reachable places become less suitable once comfort factors are considered.`,
    "",
    "Comparison details:",
    ...ranked.map(describeRecord),
    "",
    "Use this as a comfort-based comparison between candidate starting areas. It does not pick a single route or exact destination; it compares how much each selected area is constrained by the chosen comfort factors.",
  ].join("\n");
}

function toQuestion(label) {
  return { type: "question", label, prompt: label };
}

function toSuggestedAction(label, action, meta = {}) {
  return { type: "action", label, action, ...meta };
}

function withActionMeta(items, meta = {}) {
  return items.map((item) => item.type === "action" ? { ...item, ...meta } : item);
}

function buildNextStepPlan(suggestions = []) {
  return suggestions.slice(0, 3).map((item, index) => ({
    id: item.id || `${item.type || "step"}_${item.action || index + 1}`,
    type: item.type || (item.prompt ? "question" : "action"),
    label: item.label || item.prompt || "",
    prompt: item.prompt || null,
    action: item.action || null,
    actionRef: item.actionRef || null,
    actionRole: item.actionRole || null,
    appliesSettings: item.appliesSettings === true,
    requiresStartPoint: item.requiresStartPoint === true,
    canRunNow: item.canRunNow === true,
    precondition: item.precondition || null,
    willChange: Array.isArray(item.willChange) ? item.willChange : [],
  }));
}

function buildFollowUpPayload(followUpSuggestions = []) {
  return {
    followUpSuggestions,
    followUpQuestions: followUpSuggestions
      .filter((item) => item.type === "question" && item.prompt)
      .map((item) => item.prompt),
    nextSteps: buildNextStepPlan(followUpSuggestions),
  };
}

function buildFollowUpSuggestions({ detected = {}, action = null, alternativeAction = null, currentMapState = {}, resultMetadata = null } = {}) {
  const language = detected.responseLanguage || detected.language || "en";
  const hasStartPoint = Array.isArray(currentMapState?.startPoint) && currentMapState.startPoint.length === 2;
  const hasResult = hasUsableResultMetadata(resultMetadata);
  const intent = detected.intent || "general_question";

  const sets = {
    zh: {
      howToNoStart: [
        toQuestion("我想先选择一个地点并设置环境因素，该怎么开始？"),
        toQuestion("有哪些环境因素可以按我的舒适程度来设置？"),
        toQuestion("想继续了解这个工具使用了哪些城市数据吗？"),
      ],
      howToWithStart: [
        toQuestion("我想根据自己的舒适程度来设置环境因素，该怎么选？"),
        toSuggestedAction("运行可达性分析", "run_analysis"),
        toQuestion("想了解有哪些环境因素可以选择吗？"),
      ],
      actionNeedsStart: [
        toSuggestedAction("应用推荐设置并选择起点", "apply_settings_select_start"),
        toQuestion("这些环境因素对我的舒适程度应该怎么设置？"),
        toQuestion("这个预设和我自己选择因素有什么区别？"),
      ],
      actionReady: [
        toSuggestedAction("运行可达性分析", "run_analysis"),
        toQuestion("运行后我应该怎么看 comfort ratio 和可达范围？"),
      ],
      result: [
        toQuestion("这个结果说明这个区域适合步行吗？"),
        toSuggestedAction("换一个起点进行比较", "select_another_start_point"),
      ],
      comparisonResult: [
        toSuggestedAction("换一个起点继续比较", "select_another_start_point"),
        toQuestion("这两个起点的差异主要来自哪些环境因素？"),
        toQuestion("我想更详细地解释最新结果。"),
      ],
      data: [
        toQuestion("这些数据有什么限制？"),
        toQuestion("哪些因素会真正影响可达性计算？"),
      ],
      fallback: [
        toQuestion("我可以先了解如何使用 CAT 吗？"),
        toSuggestedAction("选择一个起点", "select_start_point"),
        toQuestion("有哪些环境因素可以选择？"),
      ],
    },
    en: {
      howToNoStart: [
        toQuestion("I want to choose a place and set comfort factors. How should I start?"),
        toQuestion("Which comfort factors can I set based on how they affect me?"),
        toQuestion("Would you like to learn what city data CAT uses?"),
      ],
      howToWithStart: [
        toQuestion("How should I choose comfort factors based on what affects me?"),
        toSuggestedAction("Run the accessibility analysis", "run_analysis"),
        toQuestion("Which comfort factors can I choose from?"),
      ],
      actionNeedsStart: [
        toSuggestedAction("Apply the recommended settings and choose a start point", "apply_settings_select_start"),
        toQuestion("How should I set how much these factors affect my comfort?"),
        toQuestion("What is the difference between a pre-set and choosing my own factors?"),
      ],
      actionReady: [
        toSuggestedAction("Run the accessibility analysis", "run_analysis"),
        toQuestion("How should I read the comfort ratio and reachable area after running it?"),
      ],
      result: [
        toQuestion("Does this result suggest the area is comfortable for walking?"),
        toSuggestedAction("Compare with another start point", "select_another_start_point"),
      ],
      comparisonResult: [
        toSuggestedAction("Compare with another start point", "select_another_start_point"),
        toQuestion("Which comfort factors explain the difference between these start points?"),
        toQuestion("Can you explain the latest result in more detail?"),
      ],
      data: [
        toQuestion("What are the limits of these datasets?"),
        toQuestion("Which factors actually affect the accessibility calculation?"),
      ],
      fallback: [
        toQuestion("Can you explain how to use CAT first?"),
        toSuggestedAction("Choose a start point", "select_start_point"),
        toQuestion("Which comfort factors can I choose from?"),
      ],
    },
    de: {
      howToNoStart: [
        toQuestion("Ich möchte zuerst einen Ort wählen und Komfortfaktoren einstellen. Wie starte ich?"),
        toQuestion("Welche Komfortfaktoren kann ich danach auswählen, wie stark sie mich beeinflussen?"),
        toQuestion("Möchtest du erfahren, welche Stadtdaten CAT verwendet?"),
      ],
      howToWithStart: [
        toQuestion("Wie wähle ich Komfortfaktoren danach aus, was mich beeinflusst?"),
        toSuggestedAction("Erreichbarkeitsanalyse starten", "run_analysis"),
        toQuestion("Welche Komfortfaktoren kann ich auswählen?"),
      ],
      actionNeedsStart: [
        toSuggestedAction("Empfohlene Einstellungen anwenden und Startpunkt wählen", "apply_settings_select_start"),
        toQuestion("Wie stelle ich ein, wie stark diese Faktoren meinen Komfort beeinflussen?"),
        toQuestion("Was ist der Unterschied zwischen einer Voreinstellung und selbst gewählten Faktoren?"),
      ],
      actionReady: [
        toSuggestedAction("Erreichbarkeitsanalyse starten", "run_analysis"),
        toQuestion("Wie lese ich danach comfort ratio und erreichbaren Bereich?"),
      ],
      result: [
        toQuestion("Zeigt dieses Ergebnis, ob die Gegend angenehm zum Gehen ist?"),
        toSuggestedAction("Mit einem anderen Startpunkt vergleichen", "select_another_start_point"),
      ],
      comparisonResult: [
        toSuggestedAction("Mit einem weiteren Startpunkt vergleichen", "select_another_start_point"),
        toQuestion("Welche Komfortfaktoren erklaeren den Unterschied zwischen diesen Startpunkten?"),
        toQuestion("Kannst du das neueste Ergebnis genauer erklaeren?"),
      ],
      data: [
        toQuestion("Welche Grenzen haben diese Datensätze?"),
        toQuestion("Welche Faktoren beeinflussen wirklich die Erreichbarkeitsberechnung?"),
      ],
      fallback: [
        toQuestion("Kannst du zuerst erklären, wie man CAT benutzt?"),
        toSuggestedAction("Startpunkt wählen", "select_start_point"),
        toQuestion("Welche Komfortfaktoren kann ich auswählen?"),
      ],
    },
  };
  const copy = sets[language] || sets.en;

  if (intent === "how_to_use" || intent === "general_question") return hasStartPoint ? copy.howToWithStart : copy.howToNoStart;
  if (intent === "ask_data_availability" || intent === "explain_variable") return copy.data;
  if (action?.type === "COMPARE_EXISTING_RESULTS") {
    return withActionMeta(copy.comparisonResult || copy.result, {
      willChange: ["start_point_selection"],
    });
  }
  if (action && action.type !== "ANSWER_ONLY") {
    return action.requiresStartPoint && !hasStartPoint
      ? withActionMeta(copy.actionNeedsStart, {
          actionRef: "action",
          actionRole: "primary",
          appliesSettings: true,
          requiresStartPoint: true,
          precondition: "choose_start_point",
          willChange: ["comfort_factor_settings", "start_point_selection"],
        })
      : withActionMeta(copy.actionReady, {
          actionRef: "action",
          actionRole: "primary",
          appliesSettings: true,
          canRunNow: true,
          willChange: ["comfort_factor_settings", "analysis_result"],
        });
  }
  if (intent === "explain_result" || hasResult) return withActionMeta(copy.result, {
    willChange: ["start_point_selection"],
  });
  if (alternativeAction) return withActionMeta(copy.actionNeedsStart, {
    actionRef: "alternativeAction",
    actionRole: "alternative",
    appliesSettings: true,
    requiresStartPoint: true,
    precondition: "choose_start_point",
    willChange: ["comfort_factor_settings", "start_point_selection"],
  });
  return copy.fallback;
}

function buildFollowUpQuestions(args) {
  return buildFollowUpSuggestions(args)
    .filter((item) => item.type === "question" && item.prompt)
    .map((item) => item.prompt)
    .slice(0, 3);
}

export async function buildAgentChatResponse({ message, city = "hamburg", currentMapState = {}, resultMetadata = null, agentContext = null, conversationHistory = [], analysisHistory = [] }) {
  let detected = understandAgentQuery(message, { city, hasResultMetadata: hasUsableResultMetadata(resultMetadata) });
  let intentRouterDebug = null;
  if (detected.queryUnderstanding?.needsLlmRouting) {
    let routerApplied = false;
    try {
      const routerResult = await maybeClassifyIntentWithLlm({ message, detected });
      if (routerResult) {
        intentRouterDebug = routerResult.llmDebug || null;
        detected = applyLlmRoutingToDetected(detected, routerResult, message);
        routerApplied = true;
      }
    } catch (error) {
      intentRouterDebug = {
        provider: "bigmodel",
        error: error.message,
        fallback: "deterministic_intent_router",
      };
    }
    if (!routerApplied && detected.queryUnderstanding?.actionRiskSemanticDisambiguation) {
      detected = applyLlmRoutingToDetected(detected, {
        intent: "citywide_place_recommendation",
        profile: detected.profile,
        city: detected.city,
        variable_key: detected.variable_key,
        locationText: null,
        language: detected.language,
        responseLanguage: detected.responseLanguage,
        normalizedEnglishQuery: detected.normalizedEnglishQuery,
        retrievalQuery: detected.retrievalQuery,
        confidence: 0.78,
        reason: "Conservative fallback: the message asks for citywide place suggestions rather than analysis of a selected/current point.",
      }, message);
      intentRouterDebug = intentRouterDebug || {
        provider: "deterministic",
        fallback: "action_risk_citywide_recommendation",
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
  if (/compare all selected|all selected cat analysis|compare selected/i.test(message || "") && normalizeAnalysisHistory(analysisHistory).length >= 2) {
    detected.intent = "compare_with_previous_result";
    const action = { type: "ANSWER_ONLY", city: detected.city, profile: detected.profile || null };
    const followUpSuggestions = buildFollowUpSuggestions({ detected, action, currentMapState, resultMetadata });
    return {
      reply: buildMultiAnalysisComparisonReply({ analysisHistory, language: detected.responseLanguage || detected.language || "en" }),
      intent: detected.intent,
      answerMode: "RESULT_EXPLANATION",
      detected,
      action,
      alternativeAction: null,
      ...buildFollowUpPayload(followUpSuggestions),
      capabilityCheck: checkAgentCapability({ intent: detected.intent, detected }),
      ragSufficiency: { sufficient: true, missingEvidence: [] },
      groundingCheck: { grounded: true, issues: [] },
      missingDataWarnings: [],
      citations: [],
      retrieval: { results: [] },
      debug: {
        multiPointComparison: true,
        analysisHistoryLength: normalizeAnalysisHistory(analysisHistory).length,
      },
    };
  }
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

  if (isFastHowToQuestion(message, detected)) {
    const reply = buildFastHowToResponse({ language: detected.responseLanguage || detected.language || "en" });
    const action = {
      type: "ANSWER_ONLY",
      city: detected.city,
      profile: null,
    };
    const followUpDetected = { ...detected, intent: "how_to_use" };
    const followUpSuggestions = buildFollowUpSuggestions({ detected: followUpDetected, action, currentMapState, resultMetadata });
    return {
      reply,
      intent: "how_to_use",
      answerMode: "DIRECT_ANSWER",
      detected,
      action,
      alternativeAction: null,
      ...buildFollowUpPayload(followUpSuggestions),
      capabilityCheck,
      ragSufficiency: { sufficient: true, missingEvidence: [] },
      groundingCheck: { grounded: true, issues: [] },
      missingDataWarnings: [],
      citations: [],
      retrieval: { results: [] },
      debug: {
        fastPath: true,
        reason: "frequent_how_to_capability_question",
      },
    };
  }

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

    const followUpSuggestions = buildFollowUpSuggestions({ detected, action, currentMapState, resultMetadata });
    return {
      reply: repairUngroundedReply({ reply, groundingCheck, capabilityCheck, detected }),
      intent: detected.intent,
      answerMode,
      detected,
      action,
      alternativeAction: null,
      ...buildFollowUpPayload(followUpSuggestions),
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
  const baseRetrievalQuery = detected.retrievalQuery || detected.normalizedEnglishQuery || message;
  const retrievalQuery = resultVariables.length ? `${baseRetrievalQuery} ${resultVariables.join(" ")}` : baseRetrievalQuery;

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
  if (!["specific_poi_query", "unsupported_specific_poi_query", "citywide_place_recommendation", "route_recommendation", "compare_with_previous_result", "explain_result"].includes(detected.intent)) {
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
  reply = repairUngroundedReply({ reply, groundingCheck, capabilityCheck, detected });

  const validationErrors = validateAgentAction(action);
  if (validationErrors.length) {
    return safeFallback({ detected, citations, retrieval, errors: validationErrors });
  }

  const replyValidationErrors = validateAgentReply(reply);
  if (replyValidationErrors.length) {
    return safeFallback({ detected, citations, retrieval, errors: replyValidationErrors });
  }

  const followUpSuggestions = buildFollowUpSuggestions({ detected, action, alternativeAction, currentMapState, resultMetadata });
  return {
    reply,
    intent: detected.intent,
    answerMode,
    detected,
    action,
    alternativeAction,
    ...buildFollowUpPayload(followUpSuggestions),
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
