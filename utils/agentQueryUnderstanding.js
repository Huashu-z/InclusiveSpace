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
      /choose city.*profile.*speed.*start point/,
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
      /怎么用|如何使用|网页|界面|工作流|使用流程/u,
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
      /current selected point versus/,
      /对比|比较|上一次|之前|刚刚/u,
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
  if (signals.resultExplanation && !signals.areaAction && !signals.catchment) {
    return { intent: "explain_result", confidence: 0.9, reason: "priority_result_explanation", signals };
  }
  if (signals.howTo && /routes?, areas, or both|nearest poi .*reachable area|reachable area .*nearest poi/.test(text)) {
    return { intent: "how_to_use", confidence: 0.96, reason: "priority_capability_scope", signals };
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
  if (signals.howTo) {
    return { intent: "how_to_use", confidence: 0.95, reason: "priority_how_to", signals };
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

function applyDetectedPostProcessing({ detected, message, variable, profileInference, refinements, signals }) {
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
      reason: "No user profile was stated, so default_adult is used for this action/boundary task.",
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
  detected.queryUnderstanding = {
    refinements,
    signals,
    slotPreservation: ACTION_INTENTS.has(detected.intent),
    isKnowledgeIntent: KNOWLEDGE_INTENTS.has(detected.intent),
    routingConflict: hasRoutingConflict(signals),
    needsLlmRouting: (detected.confidence || 0) < 0.75 || hasRoutingConflict(signals),
  };
  return detected;
}

export function understandAgentQuery(message, { city = "hamburg", hasResultMetadata = false } = {}) {
  const detected = detectAgentRequest(message, { city, hasResultMetadata });
  const text = normalized(message);
  const variable = detectVariable(message);
  const profileInference = inferProfile(message);
  const refinements = [];

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
  });
}
