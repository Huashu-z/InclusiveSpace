import handler from "../pages/api/agent/chat.js";

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

const cases = [
  {
    id: "elderly_hamburg_hauptbahnhof_action",
    body: {
      message: "I am an elderly person. Is Hamburg Hauptbahnhof convenient for walking?",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
    },
    assert: (data) =>
      data.intent === "area_suitability_question" &&
      data.action.type === "RUN_ACCESSIBILITY_ANALYSIS" &&
      data.action.profile === "elderly" &&
      data.action.city === "hamburg" &&
      data.action.locationText === "Hamburg Hauptbahnhof" &&
      data.answerMode === "ACTION_READY" &&
      data.ragSufficiency?.retrievalSufficient === true &&
      data.groundingCheck?.doesAnswerOriginalQuestion === true &&
      data.action.walkingSpeed === 3.0 &&
      data.action.enabledVariables.includes("stair"),
  },
  {
    id: "wheelchair_no_location_asks_for_point",
    body: {
      message: "I use a wheelchair. Can I move around this area easily?",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
    },
    assert: (data) =>
      data.intent === "area_suitability_question" &&
      data.action.type === "ASK_USER_TO_SELECT_POINT" &&
      data.answerMode === "CLARIFICATION_NEEDED" &&
      data.action.profile === "wheelchair_user" &&
      data.action.enabledVariables.includes("kerbsHigh"),
  },
  {
    id: "elderly_area_without_start_point_recommends_settings_and_asks_point",
    body: {
      message: "我是一位老年人，想知道这个区域是否适合步行/活动？",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
      resultMetadata: [],
    },
    assert: (data) =>
      data.intent === "area_suitability_question" &&
      data.action.type === "ASK_USER_TO_SELECT_POINT" &&
      data.action.profile === "elderly" &&
      data.action.requiresStartPoint === true &&
      data.action.walkingSpeed === 3.0 &&
      data.action.enabledVariables.includes("stair") &&
      data.reply.includes("Recommended walking speed") &&
      data.reply.includes("select a start point") &&
      data.retrieval.results.some((doc) => Number(doc.similarity) > 0),
  },
  {
    id: "elderly_area_with_current_start_point_can_run_now",
    body: {
      message: "我是一位老年人，想知道这个区域是否适合步行/活动？",
      city: "hamburg",
      currentMapState: {
        walkingTime: 15,
        walkingSpeed: 5,
        startPoint: [10.0064, 53.5528],
      },
    },
    assert: (data) =>
      data.intent === "area_suitability_question" &&
      data.action.type === "RUN_ACCESSIBILITY_ANALYSIS" &&
      data.action.profile === "elderly" &&
      data.action.canRunNow === true &&
      Array.isArray(data.action.coordinates) &&
      data.action.coordinates[0] === 10.0064 &&
      data.action.coordinates[1] === 53.5528 &&
      data.reply.includes("Using the current selected start point"),
  },
  {
    id: "variable_explanation_no_action",
    body: {
      message: "What does kerbsHigh mean?",
      city: "hamburg",
      currentMapState: {},
    },
    assert: (data) =>
      data.intent === "explain_variable" &&
      data.action.type === "ANSWER_ONLY" &&
      data.answerMode === "DIRECT_ANSWER" &&
      data.ragSufficiency?.canAnswerDirectly === true &&
      data.citations.some((citation) => citation.collection === "variables"),
  },
  {
    id: "tool_capability_question_how_to_use_no_action_settings",
    body: {
      message: "What can this tool do?",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
      resultMetadata: [],
    },
    assert: (data) =>
      data.intent === "how_to_use" &&
      data.action.type === "ANSWER_ONLY" &&
      data.answerMode === "DIRECT_ANSWER" &&
      data.action.walkingTime === undefined &&
      data.action.walkingSpeed === undefined &&
      data.action.enabledVariables === undefined &&
      data.retrieval.rerank?.enabled === true &&
      data.retrieval.results.every((doc) => doc.metadata?.rerankMode === "lightweight_rules_v1") &&
      data.retrieval.results.length > 0 &&
      data.retrieval.results.every((doc) => ["faq", "methodology"].includes(doc.collection)) &&
      data.retrieval.results.slice(0, 3).some((doc) => doc.metadata?.source === "faq/how_to_use_cat.md" || doc.metadata?.source === "methodology/cat_workflow.md"),
  },
  {
    id: "three_year_old_child_hauptbahnhof_profile_inference",
    body: {
      message: "三岁小孩从主火可以到达哪些区域",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
    },
    assert: (data) =>
      data.intent === "catchment_area_analysis" &&
      data.action.profile === "children_family" &&
      data.action.city === "hamburg" &&
      data.action.locationText === "Hamburg Hauptbahnhof" &&
      data.action.type === "RUN_ACCESSIBILITY_ANALYSIS" &&
      data.action.enabledVariables.includes("stair") &&
      data.action.enabledVariables.includes("trafficLight"),
  },
  {
    id: "specific_bakery_query_answer_only",
    body: {
      message: "一个三岁小孩可以从主火到达的最近的面包房是哪个",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
    },
    assert: (data) =>
      data.intent === "specific_poi_query" &&
      data.action.type === "ANSWER_ONLY" &&
      data.answerMode === "UNSUPPORTED_WITH_ALTERNATIVE" &&
      data.ragSufficiency?.retrievalSufficient === false &&
      data.groundingCheck?.clearlyStatesLimitations === true &&
      data.action.profile === "children_family" &&
      data.action.city === "hamburg" &&
      data.action.locationText === "Hamburg Hauptbahnhof" &&
      data.action.enabledVariables === undefined &&
      data.reply.includes("不能直接回答") &&
      data.reply.includes("具体面包房") &&
      data.reply.includes("可达性区域"),
  },
  {
    id: "route_recommendation_is_not_silent_catchment",
    body: {
      message: "我是一个八十岁的爷爷，我从主火到河边最舒适的路线是什么？",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
    },
    assert: (data) =>
      data.intent === "route_recommendation" &&
      data.action.type === "ANSWER_ONLY" &&
      data.answerMode === "UNSUPPORTED_WITH_ALTERNATIVE" &&
      data.action.profile === "elderly" &&
      data.action.locationText === "Hamburg Hauptbahnhof" &&
      data.action.enabledVariables === undefined &&
      data.alternativeAction?.isAlternative === true &&
      data.alternativeAction?.isDirectAnswer === false &&
      data.alternativeAction?.alternativeFor === "route_recommendation" &&
      data.capabilityCheck?.systemCanFullyAnswer === false &&
      data.ragSufficiency?.missingEvidence?.includes("origin_destination_routing") &&
      data.groundingCheck?.actionMatchesUserGoal === true &&
      data.capabilityCheck?.requiredCapability === "origin_destination_routing" &&
      data.retrieval.rerank?.enabled === true &&
      data.retrieval.results.slice(0, 3).some((doc) => doc.metadata?.source === "methodology/routing_logic.md") &&
      data.reply.includes("不能直接计算") &&
      data.reply.includes("路线"),
  },
  {
    id: "pregnant_user_approximate_profile_inference",
    body: {
      message: "I am pregnant. Is this area convenient for walking?",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
    },
    assert: (data) =>
      data.intent === "area_suitability_question" &&
      data.action.profile === "elderly" &&
      data.action.profileInference?.isApproximation === true &&
      data.action.profileInference?.fallbackProfiles?.includes("children_family") &&
      data.reply.includes("Profile match note"),
  },
  {
    id: "slow_walker_approximate_elderly_profile",
    body: {
      message: "I walk very slowly and need rest often. Is this area convenient?",
      city: "hamburg",
      currentMapState: { walkingTime: 15, walkingSpeed: 5 },
    },
    assert: (data) =>
      data.intent === "area_suitability_question" &&
      data.action.profile === "elderly" &&
      data.action.profileInference?.isApproximation === true &&
      data.action.profileInference?.reason.includes("slower walking") &&
      data.action.walkingSpeed === 3.0,
  },
  {
    id: "city_availability_no_action",
    body: {
      message: "Does Penteli have noise data?",
      city: "hamburg",
      currentMapState: {},
    },
    assert: (data) =>
      data.intent === "ask_data_availability" &&
      data.action.type === "ANSWER_ONLY" &&
      data.action.city === "penteli" &&
      data.citations.some((citation) => citation.collection === "cities"),
  },
  {
    id: "penteli_elderly_filters_missing_variables",
    body: {
      message: "I am elderly and want to consider noise in Penteli.",
      city: "penteli",
      currentMapState: { walkingTime: 15 },
    },
    assert: (data) =>
      data.intent === "area_suitability_question" &&
      data.action.city === "penteli" &&
      !data.action.enabledVariables.includes("light") &&
      !data.action.enabledVariables.includes("noise") &&
      data.missingDataWarnings.some((warning) => warning.includes("noise")) &&
      data.missingDataWarnings.some((warning) => warning.includes("light")),
  },
  {
    id: "hamburg_hauptbahnhof_geocoded_lon_lat",
    body: {
      message: "I am elderly and want to walk near Hamburg Hauptbahnhof.",
      city: "hamburg",
      currentMapState: { walkingTime: 15 },
    },
    assert: (data) =>
      data.action.type === "RUN_ACCESSIBILITY_ANALYSIS" &&
      Array.isArray(data.action.coordinates) &&
      data.action.coordinates.length === 2 &&
      Math.abs(data.action.coordinates[0] - 10.0064) < 0.001 &&
      Math.abs(data.action.coordinates[1] - 53.5528) < 0.001,
  },
  {
    id: "explain_result_uses_actual_metadata",
    body: {
      message: "Explain this result.",
      city: "hamburg",
      currentMapState: {
        walkingTime: 12,
        walkingSpeed: 3,
        profile: { id: "elderly" },
      },
      resultMetadata: [
        {
          isDefault: true,
          area: "120.50",
          time: 12,
          speed: 3,
          poiCount: 24,
        },
        {
          isDefault: false,
          area: "82.30",
          weightedRatio: "0.68",
          layers: ["stair", "slope", "kerbsHigh"],
          values: { stair: 0.6, slope: 0.7, kerbsHigh: 0.5 },
          time: 12,
          speed: 3,
          poiCount: 18,
        },
      ],
    },
    assert: (data) =>
      data.intent === "explain_result" &&
      data.action.type === "ANSWER_ONLY" &&
      data.answerMode === "RESULT_EXPLANATION" &&
      data.reply.includes("120.50 ha") &&
      data.reply.includes("82.30 ha") &&
      data.reply.includes("Suitability score: 68/100") &&
      data.reply.includes("0.68") &&
      data.reply.includes("stair, slope, kerbsHigh") &&
      !data.reply.toLowerCase().includes("many stairs"),
  },
  {
    id: "explain_result_mentions_original_unsupported_route_context",
    body: {
      message: "Explain the latest CAT result.",
      city: "hamburg",
      currentMapState: {
        walkingTime: 15,
        walkingSpeed: 3,
        profile: { id: "elderly" },
      },
      agentContext: {
        originalUserQuestion: "As an 80-year-old user, what is the most comfortable route from Hamburg Hauptbahnhof to the river?",
        originalIntent: "route_recommendation",
        originalActionType: "ANSWER_ONLY",
        capabilityCheck: {
          systemCanFullyAnswer: false,
          requiredCapability: "origin_destination_routing",
        },
      },
      resultMetadata: [
        {
          isDefault: true,
          area: "100.00",
          time: 15,
          speed: 3,
          poiCount: 10,
        },
        {
          isDefault: false,
          area: "70.00",
          weightedRatio: "0.70",
          layers: ["stair", "slope"],
          values: { stair: 0.5, slope: 0.5 },
          time: 15,
          speed: 3,
          poiCount: 8,
        },
      ],
    },
    assert: (data) =>
      data.intent === "explain_result" &&
      data.answerMode === "RESULT_EXPLANATION" &&
      data.reply.includes("Relation to original question") &&
      data.reply.includes("does not directly answer") &&
      data.reply.includes("Suitability score: 70/100"),
  },
  {
    id: "follow_up_compare_current_point_needs_run_same_settings",
    body: {
      message: "现在这个地方和刚刚的比呢？",
      city: "hamburg",
      currentMapState: {
        walkingTime: 15,
        walkingSpeed: 3,
        startPoint: [10.02, 53.56],
        startPoints: [[10.0064, 53.5528], [10.02, 53.56]],
      },
      analysisHistory: [
        {
          id: "analysis_001",
          userQuestion: "这个区域是否适合老人散步？",
          intent: "area_suitability_question",
          profile: "elderly",
          city: "hamburg",
          startPoint: { lon: 10.0064, lat: 53.5528, label: "Hamburg Hauptbahnhof" },
          settings: {
            walkingTime: 15,
            walkingSpeed: 3,
            enabledVariables: ["stair", "slope"],
            variables: { stair: 0.5, slope: 0.5 },
            layerValues: { stair: 0.5, slope: 0.5 },
          },
          baseline: { area: 100, poiCount: 20 },
          adjusted: { area: 70, comfortRatio: 0.7, poiCount: 14 },
        },
      ],
    },
    assert: (data) =>
      data.intent === "compare_with_previous_result" &&
      data.answerMode === "ACTION_READY" &&
      data.action.type === "RUN_ANALYSIS_THEN_COMPARE" &&
      data.action.baseAnalysisId === "analysis_001" &&
      data.action.profile === "elderly" &&
      data.action.walkingSpeed === 3 &&
      data.action.enabledVariables.includes("stair") &&
      data.action.coordinates[0] === 10.02 &&
      data.debug?.referenceResolution?.previousAnalysisFound === true &&
      data.debug?.referenceResolution?.currentStartPointFound === true &&
      data.debug?.referenceResolution?.currentPointAlreadyAnalyzed === false &&
      data.reply.includes("沿用刚刚的设置"),
  },
  {
    id: "follow_up_compare_existing_results",
    body: {
      message: "Compare this place with the previous one.",
      city: "hamburg",
      currentMapState: {
        walkingTime: 15,
        walkingSpeed: 3,
        startPoint: [10.02, 53.56],
        startPoints: [[10.0064, 53.5528], [10.02, 53.56]],
      },
      analysisHistory: [
        {
          id: "analysis_001",
          profile: "elderly",
          city: "hamburg",
          startPoint: { lon: 10.0064, lat: 53.5528 },
          settings: { walkingTime: 15, walkingSpeed: 3, enabledVariables: ["stair"], variables: { stair: 0.5 } },
          baseline: { area: 100, poiCount: 20 },
          adjusted: { area: 60, comfortRatio: 0.6, poiCount: 12 },
        },
        {
          id: "analysis_002",
          profile: "elderly",
          city: "hamburg",
          startPoint: { lon: 10.02, lat: 53.56 },
          settings: { walkingTime: 15, walkingSpeed: 3, enabledVariables: ["stair"], variables: { stair: 0.5 } },
          baseline: { area: 110, poiCount: 24 },
          adjusted: { area: 88, comfortRatio: 0.8, poiCount: 19 },
        },
      ],
    },
    assert: (data) =>
      data.intent === "compare_with_previous_result" &&
      data.answerMode === "COMPARE_RESULTS" &&
      data.action.type === "COMPARE_EXISTING_RESULTS" &&
      data.action.currentAnalysisId === "analysis_002" &&
      data.action.comparison.currentRatio === 0.8 &&
      data.reply.includes("Comfort ratio"),
  },
];

async function main() {
  for (const testCase of cases) {
    const res = createRes();
    await handler({ method: "POST", body: testCase.body }, res);
    const passed = res.statusCode === 200 && testCase.assert(res.body);
    console.log(`测试 ${testCase.id}: ${passed ? "✅" : "❌"}`);
    if (!passed) {
      console.log(JSON.stringify(res.body, null, 2));
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
