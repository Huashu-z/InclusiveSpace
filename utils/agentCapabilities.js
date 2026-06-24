export const CAT_CAPABILITIES = {
  catchment_area_analysis: {
    supported: true,
    requiredCapability: "comfort_based_catchment_area_analysis",
    supportedAlternative: null,
  },
  area_suitability_question: {
    supported: true,
    requiredCapability: "comfort_based_area_suitability_estimation",
    supportedAlternative: null,
  },
  parameter_recommendation: {
    supported: true,
    requiredCapability: "comfort_factor_weight_recommendation",
    supportedAlternative: null,
  },
  route_recommendation: {
    supported: false,
    partial: true,
    requiredCapability: "origin_destination_routing",
    supportedAlternative: "comfort_based_catchment_area_analysis",
  },
  specific_poi_query: {
    supported: false,
    partial: true,
    requiredCapability: "nearest_poi_ranking",
    supportedAlternative: "comfort_based_catchment_area_analysis",
  },
  unsupported_specific_poi_query: {
    supported: false,
    partial: true,
    requiredCapability: "nearest_poi_ranking",
    supportedAlternative: "comfort_based_catchment_area_analysis",
  },
  citywide_place_recommendation: {
    supported: false,
    partial: true,
    requiredCapability: "citywide_place_or_area_recommendation",
    supportedAlternative: "comfort_based_catchment_area_analysis",
  },
  unsupported_related_question: {
    supported: false,
    partial: true,
    requiredCapability: "live_or_non_walking_domain_answer",
    supportedAlternative: "cat_related_data_layers_or_walking_comfort_analysis",
  },
  explain_variable: {
    supported: true,
    requiredCapability: "knowledge_explanation",
    supportedAlternative: null,
  },
  ask_data_availability: {
    supported: true,
    requiredCapability: "data_availability_explanation",
    supportedAlternative: null,
  },
  explain_result: {
    supported: true,
    requiredCapability: "latest_result_explanation",
    supportedAlternative: null,
  },
  compare_with_previous_result: {
    supported: true,
    requiredCapability: "analysis_history_comparison",
    supportedAlternative: null,
  },
  compare_current_with_previous: {
    supported: true,
    requiredCapability: "analysis_history_comparison",
    supportedAlternative: null,
  },
  compare_two_locations: {
    supported: true,
    requiredCapability: "analysis_history_comparison",
    supportedAlternative: null,
  },
  follow_up_question: {
    supported: true,
    partial: true,
    requiredCapability: "conversation_state_resolution",
    supportedAlternative: null,
  },
  compare_profiles: {
    supported: true,
    requiredCapability: "profile_comparison",
    supportedAlternative: null,
  },
  how_to_use: {
    supported: true,
    requiredCapability: "tool_usage_explanation",
    supportedAlternative: null,
  },
  troubleshooting: {
    supported: true,
    requiredCapability: "troubleshooting_guidance",
    supportedAlternative: null,
  },
  general_question: {
    supported: true,
    partial: true,
    requiredCapability: "general_cat_knowledge_answer",
    supportedAlternative: null,
  },
  run_accessibility_analysis: {
    supported: true,
    requiredCapability: "comfort_based_catchment_area_analysis",
    supportedAlternative: null,
  },
};

export function checkAgentCapability({ intent, detected = {} } = {}) {
  const capability = CAT_CAPABILITIES[intent] || CAT_CAPABILITIES.general_question;
  const unsupportedParts = [];
  if (!capability.supported) unsupportedParts.push(capability.requiredCapability);

  return {
    userGoal: getUserGoal({ intent, detected }),
    requiredCapability: capability.requiredCapability,
    systemCanFullyAnswer: Boolean(capability.supported),
    systemCanPartiallyAnswer: Boolean(capability.supported || capability.partial),
    unsupportedParts,
    closestSupportedAlternative: capability.supportedAlternative,
    shouldRunDirectAction: [
      "catchment_area_analysis",
      "area_suitability_question",
      "run_accessibility_analysis",
    ].includes(intent) && Boolean(capability.supported),
  };
}

function getUserGoal({ intent, detected }) {
  if (intent === "route_recommendation") {
    return "find an origin-destination route or most comfortable path";
  }
  if (intent === "specific_poi_query" || intent === "unsupported_specific_poi_query") {
    return "identify or rank a specific nearby point of interest";
  }
  if (intent === "citywide_place_recommendation") {
    return "recommend suitable places or areas across a whole city";
  }
  if (intent === "unsupported_related_question") {
    return "answer a related question that is outside CAT's direct scope";
  }
  if (intent === "catchment_area_analysis" || intent === "run_accessibility_analysis") {
    return "calculate reachable area from a start point";
  }
  if (intent === "area_suitability_question") {
    return "estimate whether an area is suitable under the selected comfort factors and their impact levels";
  }
  if (["compare_with_previous_result", "compare_current_with_previous", "compare_two_locations"].includes(intent)) {
    return "compare the current selected place with a previous CAT analysis";
  }
  if (intent === "parameter_recommendation") {
    return "recommend CAT comfort factors and how strongly they affect the user";
  }
  return detected?.intent || intent || "answer a CAT-related question";
}
