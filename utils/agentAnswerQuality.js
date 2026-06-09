function sourceSet(retrieval = {}) {
  return new Set((retrieval.results || []).map((doc) => doc.metadata?.source || doc.source).filter(Boolean));
}

function hasCollection(retrieval = {}, collection) {
  return (retrieval.results || []).some((doc) => doc.collection === collection);
}

function hasAnySource(retrieval, sources = []) {
  const sourcesFound = sourceSet(retrieval);
  return sources.some((source) => sourcesFound.has(source));
}

function getTopScore(retrieval = {}) {
  return Math.max(0, ...(retrieval.results || []).map((doc) => Number(doc.similarity || 0)));
}

export function evaluateRagSufficiency({ detected, retrieval, capabilityCheck, resultMetadata = null } = {}) {
  const intent = detected?.intent || "general_question";
  const topScore = getTopScore(retrieval);
  const retrievalRelevant = (retrieval?.results || []).length > 0 && topScore > 0;
  const base = {
    retrievalRelevant,
    retrievalSufficient: false,
    canAnswerDirectly: false,
    missingEvidence: [],
    usableKnowledge: (retrieval?.results || []).slice(0, 3).map((doc) => doc.metadata?.source || doc.title).filter(Boolean),
    notSupportedByKnowledge: [],
    safeAnswerStrategy: "partial_answer_with_limitations",
    topScore,
  };

  if (!capabilityCheck?.systemCanFullyAnswer) {
    return {
      ...base,
      retrievalSufficient: false,
      canAnswerDirectly: false,
      missingEvidence: capabilityCheck?.unsupportedParts || [capabilityCheck?.requiredCapability].filter(Boolean),
      notSupportedByKnowledge: capabilityCheck?.unsupportedParts || [],
      safeAnswerStrategy: "unsupported_with_alternative",
    };
  }

  if (intent === "explain_variable") {
    const sufficient = hasCollection(retrieval, "variables");
    return {
      ...base,
      retrievalSufficient: sufficient,
      canAnswerDirectly: sufficient,
      missingEvidence: sufficient ? [] : ["matching variable documentation"],
      safeAnswerStrategy: sufficient ? "direct_answer" : "data_limitation",
    };
  }

  if (intent === "ask_data_availability") {
    const sufficient = hasCollection(retrieval, "cities");
    return {
      ...base,
      retrievalSufficient: sufficient,
      canAnswerDirectly: sufficient,
      missingEvidence: sufficient ? [] : ["city data availability documentation"],
      safeAnswerStrategy: sufficient ? "direct_answer" : "data_limitation",
    };
  }

  if (intent === "how_to_use") {
    const sufficient = hasAnySource(retrieval, ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]);
    return {
      ...base,
      retrievalSufficient: sufficient,
      canAnswerDirectly: sufficient,
      missingEvidence: sufficient ? [] : ["CAT workflow or usage documentation"],
      safeAnswerStrategy: sufficient ? "direct_answer" : "partial_answer_with_limitations",
    };
  }

  if (intent === "troubleshooting") {
    const sufficient = hasAnySource(retrieval, ["faq/troubleshooting.md", "methodology/cat_workflow.md"]);
    return {
      ...base,
      retrievalSufficient: sufficient,
      canAnswerDirectly: sufficient,
      missingEvidence: sufficient ? [] : ["troubleshooting documentation"],
      safeAnswerStrategy: sufficient ? "direct_answer" : "partial_answer_with_limitations",
    };
  }

  if (intent === "explain_result") {
    const hasResult = Array.isArray(resultMetadata)
      ? resultMetadata.length > 0
      : Boolean(resultMetadata && typeof resultMetadata === "object" && Object.keys(resultMetadata).length > 0);
    return {
      ...base,
      retrievalSufficient: hasResult,
      canAnswerDirectly: hasResult,
      missingEvidence: hasResult ? [] : ["latest CAT result metadata"],
      safeAnswerStrategy: hasResult ? "result_explanation" : "data_limitation",
    };
  }

  if (["compare_with_previous_result", "compare_current_with_previous", "compare_two_locations"].includes(intent)) {
    return {
      ...base,
      retrievalSufficient: true,
      canAnswerDirectly: true,
      missingEvidence: [],
      safeAnswerStrategy: "analysis_memory_comparison",
    };
  }

  if (["catchment_area_analysis", "area_suitability_question", "run_accessibility_analysis"].includes(intent)) {
    const sufficient = hasCollection(retrieval, "profiles") || hasCollection(retrieval, "variables") || hasCollection(retrieval, "cities");
    return {
      ...base,
      retrievalSufficient: sufficient,
      canAnswerDirectly: false,
      missingEvidence: sufficient ? [] : ["profile, variable, or city knowledge"],
      safeAnswerStrategy: sufficient ? "action_ready" : "partial_answer_with_limitations",
    };
  }

  const sufficient = retrievalRelevant && topScore >= 0.08;
  return {
    ...base,
    retrievalSufficient: sufficient,
    canAnswerDirectly: sufficient,
    missingEvidence: sufficient ? [] : ["sufficient matching CAT knowledge"],
    safeAnswerStrategy: sufficient ? "direct_answer" : "partial_answer_with_limitations",
  };
}

export function selectAnswerMode({ detected, action, capabilityCheck, ragSufficiency } = {}) {
  if (!capabilityCheck?.systemCanFullyAnswer) return "UNSUPPORTED_WITH_ALTERNATIVE";
  if (["compare_with_previous_result", "compare_current_with_previous", "compare_two_locations"].includes(detected?.intent)) {
    if (action?.type === "RUN_ANALYSIS_THEN_COMPARE") return "ACTION_READY";
    if (action?.type === "COMPARE_EXISTING_RESULTS") return "COMPARE_RESULTS";
    return "CLARIFICATION_NEEDED";
  }
  if (detected?.intent === "explain_result") {
    return ragSufficiency?.retrievalSufficient ? "RESULT_EXPLANATION" : "DATA_LIMITATION";
  }
  if (action?.type === "ASK_USER_TO_SELECT_POINT") return "CLARIFICATION_NEEDED";
  if (action?.type === "RUN_ACCESSIBILITY_ANALYSIS") return "ACTION_READY";
  if (ragSufficiency?.canAnswerDirectly) return "DIRECT_ANSWER";
  if (ragSufficiency?.retrievalRelevant) return "PARTIAL_ANSWER";
  return "DATA_LIMITATION";
}

function containsAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

export function runFinalGroundingCheck({ message, reply, detected, action, capabilityCheck, answerMode, agentContext = null } = {}) {
  const lower = String(reply || "").toLowerCase();
  const unsupportedIntent = !capabilityCheck?.systemCanFullyAnswer;
  const originalUnsupported = detected?.intent === "explain_result" &&
    agentContext?.originalUserQuestion &&
    (agentContext?.capabilityCheck?.systemCanFullyAnswer === false ||
      ["route_recommendation", "specific_poi_query", "unsupported_specific_poi_query"].includes(agentContext?.originalIntent));
  const limitationTerms = ["cannot", "can't", "not support", "not directly", "limitation", "不能", "不支持", "无法", "不能直接", "不等同"];
  const routeOverclaimTerms = ["best route is", "nearest bakery is", "最佳路线是"];

  const clearlyStatesLimitations = unsupportedIntent || originalUnsupported ? containsAny(lower, limitationTerms) : true;
  const containsUnsupportedClaims = unsupportedIntent && (
    containsAny(lower, routeOverclaimTerms) ||
    (lower.includes("最近的是") && !containsAny(lower, ["不能", "无法", "不支持", "cannot", "can't"]))
  );
  const actionMatchesUserGoal = unsupportedIntent
    ? action?.type === "ANSWER_ONLY"
    : capabilityCheck?.shouldRunDirectAction
      ? ["RUN_ACCESSIBILITY_ANALYSIS", "ASK_USER_TO_SELECT_POINT"].includes(action?.type)
      : ["compare_with_previous_result", "compare_current_with_previous", "compare_two_locations"].includes(detected?.intent)
        ? ["RUN_ANALYSIS_THEN_COMPARE", "COMPARE_EXISTING_RESULTS", "ASK_FOR_LOCATION", "ASK_FOR_PREVIOUS_RESULT"].includes(action?.type)
      : true;
  const doesAnswerOriginalQuestion = Boolean(reply) && !containsUnsupportedClaims && (clearlyStatesLimitations || !unsupportedIntent);

  return {
    originalQuestion: message,
    answerMode,
    doesAnswerOriginalQuestion,
    containsUnsupportedClaims,
    clearlyStatesLimitations,
    actionMatchesUserGoal,
    revisionNeeded: !(doesAnswerOriginalQuestion && !containsUnsupportedClaims && actionMatchesUserGoal),
    reason: getGroundingReason({
      detected,
      unsupportedIntent,
      originalUnsupported,
      clearlyStatesLimitations,
      containsUnsupportedClaims,
      actionMatchesUserGoal,
    }),
  };
}

function getGroundingReason({ detected, unsupportedIntent, originalUnsupported, clearlyStatesLimitations, containsUnsupportedClaims, actionMatchesUserGoal }) {
  if (containsUnsupportedClaims) return "The answer appears to make a claim that the current CAT capability cannot support.";
  if (!actionMatchesUserGoal) return "The planned action does not match the user's goal.";
  if ((unsupportedIntent || originalUnsupported) && !clearlyStatesLimitations) return "The answer does not clearly state the unsupported capability limitation.";
  return `The answer is aligned with intent ${detected?.intent || "unknown"}.`;
}

export function repairUngroundedReply({ reply, groundingCheck, capabilityCheck } = {}) {
  if (!groundingCheck?.revisionNeeded) return reply;
  const limitation = capabilityCheck?.requiredCapability
    ? `Current CAT cannot fully provide ${capabilityCheck.requiredCapability}. `
    : "Current CAT cannot fully answer this request. ";
  return `${limitation}${reply || ""}`.trim();
}
