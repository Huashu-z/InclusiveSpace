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
      data.intent === "run_accessibility_analysis" &&
      data.action.type === "RUN_ACCESSIBILITY_ANALYSIS" &&
      data.action.profile === "elderly" &&
      data.action.city === "hamburg" &&
      data.action.locationText === "Hamburg Hauptbahnhof" &&
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
      data.intent === "run_accessibility_analysis" &&
      data.action.type === "ASK_USER_TO_SELECT_POINT" &&
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
      data.intent === "run_accessibility_analysis" &&
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
      data.intent === "run_accessibility_analysis" &&
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
      data.action.walkingTime === undefined &&
      data.action.walkingSpeed === undefined &&
      data.action.enabledVariables === undefined &&
      data.retrieval.results.length > 0 &&
      data.retrieval.results.every((doc) => ["faq", "methodology"].includes(doc.collection)) &&
      data.retrieval.results.slice(0, 3).some((doc) => doc.metadata?.source === "faq/how_to_use_cat.md" || doc.metadata?.source === "methodology/cat_workflow.md"),
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
      data.intent === "run_accessibility_analysis" &&
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
      data.reply.includes("120.50 ha") &&
      data.reply.includes("82.30 ha") &&
      data.reply.includes("Suitability score: 68/100") &&
      data.reply.includes("0.68") &&
      data.reply.includes("stair, slope, kerbsHigh") &&
      !data.reply.toLowerCase().includes("many stairs"),
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
