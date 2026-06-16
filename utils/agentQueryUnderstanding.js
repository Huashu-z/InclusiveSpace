import {
  detectAgentRequest,
  detectLocationText,
  detectRouteRecommendation,
  detectSpecificPoiQuery,
  detectVariable,
} from "./agentIntent.js";
import { inferProfile } from "./profileInference.js";

const ACTION_INTENTS = new Set([
  "catchment_area_analysis",
  "area_suitability_question",
  "run_accessibility_analysis",
  "route_recommendation",
  "specific_poi_query",
  "unsupported_specific_poi_query",
]);

const KNOWLEDGE_INTENTS = new Set([
  "how_to_use",
  "explain_variable",
  "ask_data_availability",
  "troubleshooting",
  "general_question",
]);

function normalized(text) {
  return String(text || "").toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function detectLanguage(message) {
  const raw = String(message || "");
  const text = raw.toLowerCase();
  if (/[\u4e00-\u9fff]/u.test(raw)) return "zh";
  if (/[äöüß]/i.test(raw) || /\b(wo|welche|welcher|geeignet|spazieren|ältere|rollstuhl|karte)\b/i.test(raw)) return "de";
  if (/[α-ωάέήίόύώ]/i.test(raw)) return "el";
  if (/\b(donde|dónde|adecuado|caminar|mayores|silla de ruedas|ruta)\b/i.test(text)) return "es";
  return "en";
}

function buildDeterministicRetrievalQuery({ message, detected, language }) {
  const city = detected.city || "hamburg";
  const profile = detected.profile || "";
  const variable = detected.variable_key || "";
  const intent = detected.intent || "general_question";
  const intentHints = {
    citywide_place_recommendation: "CAT citywide place recommendation limitation candidate points comfort catchment analysis",
    route_recommendation: "CAT route recommendation limitation origin destination routing catchment analysis alternative",
    specific_poi_query: "CAT specific POI nearest ranking limitation catchment analysis alternative",
    unsupported_specific_poi_query: "CAT specific POI nearest ranking limitation catchment analysis alternative",
    how_to_use: "CAT workflow how to use city comfort factors impact levels speed start point optional profile preset run analysis",
    troubleshooting: "CAT troubleshooting map result not update empty result start point variables",
    ask_data_availability: "CAT data availability city variables missing unsupported data",
    explain_variable: "CAT comfort variable definition environmental factor",
    explain_result: "CAT result interpretation comfort ratio default area adjusted area limitations",
    compare_with_previous_result: "CAT compare previous current analysis result comfort ratio area",
    area_suitability_question: "CAT profile walking suitability selected area comfort variables",
    catchment_area_analysis: "CAT catchment area reachable area start point walking time comfort",
  };
  const hint = intentHints[intent] || "CAT accessibility assistant knowledge";
  if (language === "en") return `${message} ${hint} ${city} ${profile} ${variable}`.trim();
  return `${hint} ${city} ${profile} ${variable} original user query: ${message}`.trim();
}

function shouldUseMultilingualRouter({ language, detected }) {
  if (language === "en") return false;
  if (detected?.method === "priority_gate" && detected?.intent !== "general_question") return false;
  return true;
}

function hasConcreteStartOrAreaCue(text) {
  return hasAny(text, [
    /this area/,
    /this place/,
    /selected area/,
    /selected point/,
    /current area/,
    /current point/,
    /from here/,
    /from the current/,
    /\baround\s+.+$/,
    /\bnear\s+.+$/,
    /\bat\s+.+$/,
    /hauptbahnhof/,
    /从.+出发/u,
    /这个区域|当前区域|这个地方|当前点|选择的点|选中的点|从这里|从.+出发|附近|主火/u,
  ]);
}

function hasCitywideRecommendationShape(text) {
  if (hasConcreteStartOrAreaCue(text)) return false;
  const mentionsCity = /\b(hamburg|penteli)\b|汉堡|彭特利/u.test(text);
  const asksRecommendation = hasAny(text, [
    /\bwhere\b/,
    /\bwhich\b/,
    /\bwhat\b/,
    /\brecommend\b/,
    /\bsuggest\b/,
    /\bgood\b/,
    /\bbest\b/,
    /\bnice\b/,
    /\bsuitable\b/,
    /\bcomfortable\b/,
    /哪里|哪儿|哪个|哪些|推荐|适合|适宜|舒服|舒适/u,
  ]);
  const asksPlaceClass = hasAny(text, [
    /places?/,
    /areas?/,
    /neighborhoods?/,
    /districts?/,
    /spots?/,
    /locations?/,
    /somewhere/,
    /场地|地方|区域|地点|街区/u,
  ]);
  const mentionsUserOrActivity = hasAny(text, [
    /elderly/,
    /older/,
    /senior/,
    /children/,
    /kids?/,
    /family/,
    /wheelchair/,
    /walk/,
    /walking/,
    /stroll/,
    /activity/,
    /老年|老人|孩子|儿童|家庭|轮椅|散步|步行|活动/u,
  ]);

  return mentionsCity && asksRecommendation && mentionsUserOrActivity && (asksPlaceClass || /\bwhere\b|哪里|哪儿/u.test(text));
}

function detectIntentSignals({ text, message, variable, hasResultMetadata }) {
  return {
    howTo: hasAny(text, [
      /how.*use/,
      /use.*cat/,
      /what can .*tool.*do/,
      /what.*cat.*do/,
      /what.*tool.*do/,
      /tool.*capabilit/,
      /correct workflow/,
      /workflow .*run/,
      /choose city.*(comfort factors|weights|profile).*speed.*start point/,
      /choose .*start point/,
      /automatically update .*map settings/,
      /assistant .*automatically update/,
      /for routes, areas, or both/,
      /route.*area.*both/,
      /nearest poi .*reachable area/,
      /reachable area .*nearest poi/,
      /instruction/,
      /guide/,
      /before i run cat/,
      /before i start/,
      /怎么用|如何使用|网页|界面|工作流|使用流程|用途|有什么用|可以做什么|能做什么|功能/u,
    ]),
    variableExplanation: Boolean(variable) && hasAny(text, [
      /what does .* mean/,
      /what does .* capture/,
      /what is .* in .*variables?/,
      /what is .* used for/,
      /explain why .* matters?/,
      /explain .*variable/,
      /meaning of/,
      /understand .* as a variable/,
      /代表什么|是什么意思|含义|解释.*变量/u,
    ]),
    dataAvailability: hasAny(text, [
      /data/,
      /available/,
      /availability/,
      /have .* data/,
      /support/,
      /missing/,
      /unavailable/,
      /can .*consider/,
      /can .*evaluate/,
      /still consider/,
      /if data is missing/,
      /invent a reason/,
      /有.*数据|是否有|支持|可用|缺少|数据/u,
    ]) && (text.includes("hamburg") || text.includes("penteli") || Boolean(variable) || /data is missing|invent a reason/.test(text)),
    troubleshooting: hasAny(text, [
      /trouble/,
      /error/,
      /failed/,
      /not working/,
      /map .*not.*update/,
      /map .*not.*show/,
      /did not update/,
      /did not display/,
      /no reachable/,
      /empty result/,
      /result looks blank/,
      /selected .* forgot .*start point/,
      /why no analysis/,
      /what should i check/,
      /没有结果|地图.*没有显示|没有显示.*可达|为什么.*没有分析|没更新/u,
    ]),
    resultExplanation: hasResultMetadata || hasAny(text, [
      /comfort ratio/,
      /explain .*result/,
      /latest .*result/,
      /red area result/,
      /what does .*result mean/,
      /accessibility takeaway/,
      /main .*takeaway/,
      /score/,
      /解释结果|结果|面积|得分/u,
    ]),
    comparison: hasAny(text, [
      /previous settings/,
      /previous .*compare/,
      /compare .*previous/,
      /compare this place with the result/,
      /result we just ran/,
      /just ran/,
      /versus last time/,
      /last time/,
      /last one/,
      /what about .*current selected point/,
      /how about .*current selected point/,
      /what about .*this start point/,
      /how about .*this start point/,
      /what about .*current start point/,
      /how about .*current start point/,
      /this start point/,
      /current start point/,
      /new start point/,
      /current selected point versus/,
      /对比|比较|上一次|之前|刚刚|这个起点|当前起点|新起点/u,
    ]),
    poi: detectSpecificPoiQuery(message) || hasAny(text, [
      /nearest .*?(bakery|cafe|restaurant|supermarket|pharmacy|park entrance|playground|toilet|bench)/,
      /closest .*?(bakery|cafe|restaurant|supermarket|pharmacy|park entrance|playground|toilet|bench)/,
      /which .*?(bakery|cafe|restaurant|supermarket|pharmacy|park entrance|playground|toilet|bench)/,
      /what .*?(bakery|cafe|restaurant|supermarket|pharmacy|park entrance|playground|toilet|bench).*best/,
      /what .*?(bakery|cafe|restaurant|supermarket|pharmacy|park entrance|playground|toilet|bench)/,
      /best .*?(bakery|cafe|restaurant|supermarket|pharmacy|park entrance|playground|toilet|bench)/,
      /where is .*?(bakery|cafe|restaurant|supermarket|pharmacy|park entrance|playground|toilet|bench)/,
      /rank .*?(pharmacies|cafes|restaurants|supermarkets|playgrounds)/,
      /which .* is inside .*catchment area/,
      /哪个|哪家|最近.*(面包|咖啡|餐厅|药店|超市|公园|入口|游乐场)|排名/u,
    ]),
    route: detectRouteRecommendation(message) || hasAny(text, [
      /exact street route/,
      /navigation instructions/,
      /navigate .* to /,
      /directions? to /,
      /route .* from .* to /,
      /from .* to .* route/,
      /how to get to/,
      /路线|路径|怎么走|怎么去|导航|从.+到.+/u,
    ]),
    citywideRecommendation: hasAny(text, [
      /where can i .*?(comfortable|good|suitable|pleasant|nice).*?(walk|walking|stroll)/,
      /where .*?(can|could|should) .*?(take|have|go for).*?(comfortable|good|suitable|pleasant|nice).*?(walk|stroll)/,
      /where .*?(comfortable|good|suitable|pleasant|nice).*?(walk|walking|stroll)/,
      /where in .*?(hamburg|penteli).*?(suitable|good|best|comfortable|walk|activity|stroll)/,
      /where (are|is).*?(good|suitable|best|comfortable).*?(places?|areas?|neighborhoods?|districts?).*?(hamburg|penteli).*?(walk|walking|stroll|activity|elderly|older|senior|children|wheelchair|family)/,
      /(good|suitable|best|comfortable).*?(places?|areas?|neighborhoods?|districts?).*?(hamburg|penteli).*?(for|to).*?(walk|walking|stroll|activity|elderly|older|senior|children|wheelchair|family)/,
      /(places?|areas?|neighborhoods?|districts?).*?(in|around).*?(hamburg|penteli).*?(for).*?(elderly|older|senior|children|wheelchair|family).*?(walk|walking|stroll|activity)/,
      /(hamburg|penteli).*?(where|which area|what area).*?(suitable|good|best|comfortable|walk|activity|stroll)/,
      /recommend .*?(place|area|neighborhood|district).*?(walk|stroll|activity|elderly|children|wheelchair|family)/,
      /which .*?(area|place|neighborhood|district).*?(suitable|good|best|comfortable).*?(walk|stroll|activity|elderly|children|wheelchair|family)/,
      /wo .*?(hamburg|penteli).*?(geeignet|gut|am besten|spazieren|laufen|aktivität)/,
      /(hamburg|penteli).*?(wo|welcher bereich|welche gegend|welcher ort).*?(geeignet|gut|am besten|spazieren|laufen|aktivität)/,
      /(汉堡|彭特利).*?(哪里|哪儿|哪个地方|哪些地方|哪个区域|哪些区域).*?(适合|适宜|方便|舒服|舒适|推荐).*?(散步|步行|活动|老人|老年|孩子|儿童|轮椅)/u,
      /(哪里|哪儿|哪个地方|哪些地方|哪个区域|哪些区域).*?(适合|适宜|方便|舒服|舒适|推荐).*?(老人|老年|孩子|儿童|轮椅).*?(散步|步行|活动)/u,
    ]) && !hasAny(text, [
      /this area/,
      /this place/,
      /selected area/,
      /selected point/,
      /current area/,
      /current point/,
      /from here/,
      /around .+$/,
      /near .+$/,
      /从.+出发/u,
      /这个区域|当前区域|这个地方|当前点|选择的点|选中的点|从这里|从.+出发|附近/u,
    ]),
    catchment: hasAny(text, [
      /what area can .* reach/,
      /where can .* reach/,
      /what can .* reach/,
      /reachable from the selected point/,
      /catchment/,
      /reachable area/,
      /within .* minutes/,
      /can .* reach from/,
      /能到哪里|可达范围|可达区域|哪些区域/u,
    ]),
    areaAction: hasAny(text, [
      /selected area/,
      /this area/,
      /this place/,
      /current area/,
      /current selected point/,
      /check the current selected point/,
      /suitable for walking/,
      /comfortable for walking/,
      /walkable/,
      /move around/,
      /run .*analysis/,
      /analy[sz]e/,
      /settings? .*hamburg/,
      /use .*settings/,
      /use .*assumptions/,
      /stroller-friendly assumptions/,
      /did not choose .*start point/,
      /no exact start point/,
      /forgot .*start point/,
      /want .*settings/,
      /设置|分析|这个区域|当前区域|当前点|适合.*步行|适合.*活动/u,
    ]),
  };
}

function priorityGate({ text, message, variable, baseIntent, hasResultMetadata }) {
  const signals = detectIntentSignals({ text, message, variable, hasResultMetadata });

  if (signals.troubleshooting) {
    return { intent: "troubleshooting", confidence: 0.96, reason: "priority_troubleshooting", signals };
  }
  if (signals.variableExplanation) {
    return { intent: "explain_variable", confidence: 0.96, reason: "priority_variable_explanation", signals };
  }
  if (signals.dataAvailability) {
    return { intent: "ask_data_availability", confidence: 0.95, reason: "priority_data_availability", signals };
  }
  if (signals.comparison) {
    return { intent: "compare_with_previous_result", confidence: 0.95, reason: "priority_comparison", signals };
  }
  if (signals.howTo) {
    return { intent: "how_to_use", confidence: 0.95, reason: "priority_how_to", signals };
  }
  if (hasResultMetadata && signals.resultExplanation && !signals.catchment) {
    return { intent: "explain_result", confidence: 0.94, reason: "priority_existing_result_explanation", signals };
  }
  if (signals.resultExplanation && !signals.areaAction && !signals.catchment) {
    return { intent: "explain_result", confidence: 0.9, reason: "priority_result_explanation", signals };
  }
  if (signals.howTo && /routes?, areas, or both|nearest poi .*reachable area|reachable area .*nearest poi/.test(text)) {
    return { intent: "how_to_use", confidence: 0.96, reason: "priority_capability_scope", signals };
  }
  if (signals.citywideRecommendation) {
    return { intent: "citywide_place_recommendation", confidence: 0.94, reason: "priority_citywide_recommendation_boundary", signals };
  }
  if (signals.poi && !/navigation|directions?|navigate|route|path|turn-by-turn|导航|路线|路径|怎么走|怎么去/u.test(text)) {
    return { intent: "specific_poi_query", confidence: 0.94, reason: "priority_specific_poi_boundary", signals };
  }
  if (signals.route) {
    return { intent: "route_recommendation", confidence: 0.94, reason: "priority_route_boundary", signals };
  }
  if (signals.poi) {
    return { intent: "specific_poi_query", confidence: 0.94, reason: "priority_specific_poi_boundary", signals };
  }
  if (signals.areaAction && /settings?|assumptions|start point|selected point|current point|hamburg|stroller|reduced mobility|not disabled/.test(text)) {
    return { intent: "area_suitability_question", confidence: 0.88, reason: "priority_parameter_action", signals };
  }
  if (signals.catchment) {
    return { intent: "catchment_area_analysis", confidence: 0.9, reason: "priority_catchment_action", signals };
  }
  if (signals.areaAction || baseIntent === "area_suitability_question") {
    return { intent: "area_suitability_question", confidence: 0.84, reason: "priority_area_action", signals };
  }

  return { intent: baseIntent, confidence: null, reason: null, signals };
}

function refineIntent({ text, baseIntent, variable }) {
  if (hasAny(text, [
    /what steps should i follow/,
    /workflow of this accessibility assistant/,
    /how.*map interface/,
    /how.*assistant/,
    /what.*assistant.*do/,
  ])) {
    return { intent: "how_to_use", confidence: 0.94, reason: "tool_workflow_paraphrase" };
  }

  if (variable && hasAny(text, [
    /what does .* represent/,
    /what is .* used for/,
    /meaning of/,
    /explain .*variable/,
    /variable .*mean/,
  ])) {
    return { intent: "explain_variable", confidence: 0.94, reason: "variable_explanation_paraphrase" };
  }

  if (hasAny(text, [/reachable area did not display/, /did not display/, /what should i check/, /empty result/])) {
    return { intent: "troubleshooting", confidence: 0.94, reason: "troubleshooting_paraphrase" };
  }

  if (hasAny(text, [/what area can .* reach/, /where can .* reach/, /reachable from the selected point/])) {
    return { intent: "catchment_area_analysis", confidence: 0.88, reason: "reachable_area_paraphrase" };
  }

  if (baseIntent === "general_question" && hasAny(text, [
    /selected point/,
    /selected area/,
    /this area/,
    /this place/,
    /walking setting/,
    /step-free movement/,
    /comfortable for walking/,
  ])) {
    return { intent: "area_suitability_question", confidence: 0.82, reason: "area_suitability_paraphrase" };
  }

  return null;
}

function inferRetrievalPlan({ intent }) {
  if (intent === "how_to_use") return { collections: ["faq", "methodology"], reason: "tool_usage_only" };
  if (intent === "explain_variable") return { collections: ["variables"], reason: "variable_definition_only" };
  if (intent === "ask_data_availability") return { collections: ["cities", "methodology"], reason: "city_data_only" };
  if (intent === "troubleshooting") return { collections: ["faq", "methodology"], reason: "troubleshooting_only" };
  if (["route_recommendation", "specific_poi_query", "unsupported_specific_poi_query"].includes(intent)) {
    return { collections: ["methodology", "faq", "profiles"], reason: "capability_boundary_with_slots" };
  }
  if (intent === "citywide_place_recommendation") {
    return { collections: ["methodology", "faq", "profiles"], reason: "citywide_recommendation_boundary" };
  }
  if (["catchment_area_analysis", "area_suitability_question", "run_accessibility_analysis"].includes(intent)) {
    return { collections: ["profiles", "variables", "cities", "methodology"], reason: "action_grounding" };
  }
  return { collections: null, reason: "default" };
}

function shouldClearProfile(intent) {
  return ["how_to_use", "explain_variable", "ask_data_availability", "troubleshooting", "general_question", "explain_result"].includes(intent);
}

function shouldDefaultProfile(intent) {
  return ACTION_INTENTS.has(intent);
}

function hasRoutingConflict(signals) {
  if (!signals) return false;
  const knowledgeCount = [
    signals.howTo,
    signals.variableExplanation,
    signals.dataAvailability,
    signals.troubleshooting,
    signals.resultExplanation,
    signals.comparison,
  ].filter(Boolean).length;
  const actionCount = [signals.areaAction, signals.catchment].filter(Boolean).length;
  const boundaryCount = [signals.poi, signals.route].filter(Boolean).length;
  return (knowledgeCount && actionCount) || (boundaryCount && actionCount) || knowledgeCount > 1;
}

function needsSemanticDisambiguation({ text, detected, signals }) {
  if (!detected || !signals) return false;
  if (!["area_suitability_question", "catchment_area_analysis"].includes(detected.intent)) return false;
  if (signals.areaAction || signals.catchment || signals.citywideRecommendation || signals.poi || signals.route) return false;
  return hasCitywideRecommendationShape(text);
}

function applyDetectedPostProcessing({ detected, message, variable, profileInference, refinements, signals, language }) {
  const resolvedLanguage = language || detectLanguage(message);
  const text = normalized(message);
  const semanticDisambiguationNeeded = needsSemanticDisambiguation({ text, detected, signals });
  detected.variable_key = variable;
  detected.locationText = ACTION_INTENTS.has(detected.intent) ? detectLocationText(message) : null;
  if (!detected.locationText && ACTION_INTENTS.has(detected.intent)) {
    const lower = normalized(message);
    if (lower.includes("hamburg") || lower.includes("penteli")) detected.locationText = detected.city;
  }

  if (shouldClearProfile(detected.intent)) {
    detected.profile = null;
    detected.profileInference = {
      ...profileInference,
      profile: null,
      reason: "Profile evidence is ignored for this knowledge/data/tool question.",
    };
  } else if (profileInference.profile) {
    detected.profile = profileInference.profile;
    detected.profileInference = profileInference;
  } else if (shouldDefaultProfile(detected.intent)) {
    detected.profile = "default_adult";
    detected.profileInference = {
      profile: "default_adult",
      confidence: 0.45,
      isApproximation: false,
      reason: "No specific comfort-factor preference was stated, so the default_adult preset is used as a quick starting point for this action/boundary task.",
      matchedTerm: null,
      fallbackProfiles: [],
    };
  }

  detected.isFollowUp = [
    "compare_with_previous_result",
    "compare_current_with_previous",
    "compare_two_locations",
    "follow_up_question",
  ].includes(detected.intent);
  detected.referenceTarget = detected.intent === "compare_with_previous_result" ? "latest_analysis_result" : null;
  detected.currentTarget = detected.intent === "compare_with_previous_result" ? "current_selected_start_point" : null;
  detected.requiresComparison = detected.intent === "compare_with_previous_result";
  detected.retrievalPlan = inferRetrievalPlan({ intent: detected.intent });
  detected.language = detected.language || resolvedLanguage;
  detected.responseLanguage = detected.responseLanguage || resolvedLanguage;
  detected.normalizedEnglishQuery = detected.normalizedEnglishQuery || null;
  detected.retrievalQuery = detected.retrievalQuery || buildDeterministicRetrievalQuery({
    message,
    detected,
    language: resolvedLanguage,
  });
  detected.queryUnderstanding = {
    refinements,
    signals,
    language: resolvedLanguage,
    responseLanguage: detected.responseLanguage,
    normalizedEnglishQuery: detected.normalizedEnglishQuery,
    retrievalQuery: detected.retrievalQuery,
    slotPreservation: ACTION_INTENTS.has(detected.intent),
    isKnowledgeIntent: KNOWLEDGE_INTENTS.has(detected.intent),
    routingConflict: hasRoutingConflict(signals),
    actionRiskSemanticDisambiguation: semanticDisambiguationNeeded,
    needsLlmRouting: (detected.confidence || 0) < 0.75 ||
      hasRoutingConflict(signals) ||
      semanticDisambiguationNeeded ||
      signals.citywideRecommendation ||
      signals.poi ||
      signals.route ||
      shouldUseMultilingualRouter({ language: resolvedLanguage, detected }),
  };
  return detected;
}

export function understandAgentQuery(message, { city = "hamburg", hasResultMetadata = false } = {}) {
  const detected = detectAgentRequest(message, { city, hasResultMetadata });
  const text = normalized(message);
  const variable = detectVariable(message);
  const profileInference = inferProfile(message);
  const refinements = [];
  const language = detectLanguage(message);

  const priority = priorityGate({
    text,
    message,
    variable,
    baseIntent: detected.intent,
    hasResultMetadata,
  });
  if (priority.intent && priority.intent !== detected.intent) {
    detected.intent = priority.intent;
    detected.confidence = Math.max(detected.confidence || 0, priority.confidence || 0);
    detected.method = "priority_gate";
    refinements.push(priority.reason);
  }

  const intentRefinement = refineIntent({ text, baseIntent: detected.intent, variable });
  if (intentRefinement && intentRefinement.intent !== detected.intent) {
    detected.intent = intentRefinement.intent;
    detected.confidence = Math.max(detected.confidence || 0, intentRefinement.confidence);
    detected.method = "query_understanding";
    refinements.push(intentRefinement.reason);
  }

  return applyDetectedPostProcessing({
    detected,
    message,
    variable,
    profileInference,
    refinements,
    signals: priority.signals,
    language,
  });
}

export function applyLlmRoutingToDetected(detected, routerResult, message) {
  if (!routerResult || typeof routerResult !== "object") return detected;
  const variable = routerResult.variable_key || detectVariable(message);
  const profileInference = inferProfile(message);
  const refinements = [
    ...(detected.queryUnderstanding?.refinements || []),
    "llm_router",
  ];
  if (routerResult.intent) {
    detected.intent = routerResult.intent;
    detected.confidence = Math.max(Number(routerResult.confidence || 0), detected.confidence || 0.76);
    detected.method = "llm_router";
  }
  if (routerResult.city) detected.city = routerResult.city;
  if (routerResult.profile !== undefined) {
    detected.profile = routerResult.profile;
  }
  if (routerResult.language) detected.language = routerResult.language;
  if (routerResult.responseLanguage) detected.responseLanguage = routerResult.responseLanguage;
  if (routerResult.normalizedEnglishQuery) detected.normalizedEnglishQuery = routerResult.normalizedEnglishQuery;
  if (routerResult.retrievalQuery) detected.retrievalQuery = routerResult.retrievalQuery;
  detected.llmRouting = {
    used: true,
    reason: routerResult.reason || null,
    raw: routerResult,
  };
  return applyDetectedPostProcessing({
    detected,
    message,
    variable,
    profileInference: routerResult.profile
      ? {
          profile: routerResult.profile,
          confidence: Number(routerResult.confidence || 0.76),
          isApproximation: routerResult.profileIsApproximation === true,
          reason: routerResult.reason || "Profile refined by LLM intent router.",
          matchedTerm: null,
          fallbackProfiles: [],
        }
      : profileInference,
    refinements,
    signals: detected.queryUnderstanding?.signals || {},
    language: routerResult.language || detected.language || detectLanguage(message),
  });
}
