import fs from "fs/promises";
import path from "path";

const OUT = path.join(process.cwd(), "eval", "agent_expanded_eval_cases.json");

function caseOf({
  id,
  category,
  query,
  context = { currentCity: "hamburg" },
  expectedIntent,
  expectedProfile = null,
  expectedCity = "hamburg",
  expectedLocationText = null,
  expectedSources = [],
  expectedVariables = [],
  forbiddenVariables = [],
  shouldRunAnalysis = false,
  shouldAskForMapPoint = false,
  expectedWarnings = [],
}) {
  return {
    id,
    category,
    query,
    context,
    expectedIntent,
    expectedProfile,
    expectedCity,
    expectedLocationText,
    expectedSources,
    expectedVariables,
    forbiddenVariables,
    shouldRunAnalysis,
    shouldAskForMapPoint,
    expectedWarnings,
  };
}

const profileSpecs = {
  elderly: {
    profile: "elderly",
    variables: ["stair", "slope", "kerbsHigh"],
    sources: ["profiles/elderly.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    forbidden: ["noise"],
  },
  wheelchair_user: {
    profile: "wheelchair_user",
    variables: ["stair", "slope", "kerbsHigh", "narrowRoads"],
    sources: ["profiles/wheelchair_user.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    forbidden: ["noise"],
  },
  visually_impaired: {
    profile: "visually_impaired",
    variables: ["trafficLight", "pedestrianFlow"],
    sources: ["profiles/visually_impaired.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    forbidden: ["noise"],
  },
  children_family: {
    profile: "children_family",
    variables: ["stair", "kerbsHigh", "trafficLight"],
    sources: ["profiles/children_family.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    forbidden: ["noise"],
  },
  default_adult: {
    profile: "default_adult",
    variables: ["light", "trafficLight", "station"],
    sources: ["profiles/default_adult.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    forbidden: [],
  },
};

const profileQueries = [
  ["elderly", "My grandma walks slowly. Around Hamburg Hauptbahnhof, is this a reasonable area for a short walk?", "Hamburg Hauptbahnhof"],
  ["elderly", "As an older adult, can I walk comfortably from Hauptbahnhof?", "Hauptbahnhof"],
  ["elderly", "I am a slow walker. Please check the place I selected for a short activity.", null],
  ["elderly", "My grandfather needs a calm walking area near Hamburg Hauptbahnhof.", "Hamburg Hauptbahnhof"],
  ["elderly", "I get tired easily and want to know whether this area is suitable for walking.", null],
  ["wheelchair_user", "For a wheelchair user, can we check the place I just selected?", null],
  ["wheelchair_user", "I use a wheelchair and want to avoid stairs around Hauptbahnhof.", "Hauptbahnhof"],
  ["wheelchair_user", "Can you assess this area for wheelchair access?", null],
  ["wheelchair_user", "My friend uses a wheelchair. Is Hamburg Hauptbahnhof okay as a start point?", "Hamburg Hauptbahnhof"],
  ["wheelchair_user", "I need step-free movement from the selected point.", null],
  ["visually_impaired", "I am visually impaired and need safer crossings in this area.", null],
  ["visually_impaired", "For a blind pedestrian, can you check around Hamburg Hauptbahnhof?", "Hamburg Hauptbahnhof"],
  ["visually_impaired", "I have low vision. Is the selected area comfortable for walking?", null],
  ["visually_impaired", "Please consider traffic lights and pedestrian flow for a visually impaired user.", null],
  ["children_family", "My three-year-old child and I want to walk around this area.", null],
  ["children_family", "Can a parent with a small child move around Hamburg Hauptbahnhof comfortably?", "Hamburg Hauptbahnhof"],
  ["children_family", "For kids and family walking, what area can we reach from the selected point?", null],
  ["children_family", "A stroller and small child are involved. Please check this place.", null],
  ["default_adult", "Can I check the walking comfort from Hamburg Hauptbahnhof?", "Hamburg Hauptbahnhof"],
  ["default_adult", "Is the selected area suitable for a normal adult walk?", null],
];

const knowledgeQueries = [
  ["how_to_use", "What can this tool do?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["how_to_use", "Before I start, what exactly can this map assistant help me do?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["how_to_use", "How do I use CAT to run a catchment analysis?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["how_to_use", "What steps should I follow on this map interface?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["how_to_use", "Explain the workflow of this accessibility assistant.", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["explain_variable", "What does poorPavement mean in this accessibility analysis?", ["variables/comfort_variables.md"], "poorPavement"],
  ["explain_variable", "Explain the kerbsHigh variable.", ["variables/comfort_variables.md"], "kerbsHigh"],
  ["explain_variable", "What does pedestrianFlow represent?", ["variables/comfort_variables.md"], "pedestrianFlow"],
  ["explain_variable", "In CAT, what does slope mean?", ["variables/comfort_variables.md"], "slope"],
  ["explain_variable", "What is the meaning of tactile_pavement?", ["variables/comfort_variables.md"], "tactile_pavement"],
  ["ask_data_availability", "Does Hamburg support lighting and noise data?", ["cities/hamburg.md", "methodology/data_limitations.md"]],
  ["ask_data_availability", "If I switch to Penteli, can the agent consider lighting and noise?", ["cities/penteli.md", "methodology/data_limitations.md"], null, "penteli"],
  ["ask_data_availability", "Which data is unavailable in Penteli?", ["cities/penteli.md", "methodology/data_limitations.md"], null, "penteli"],
  ["ask_data_availability", "Can Hamburg use wheelchair toilet data?", ["cities/hamburg.md", "methodology/data_limitations.md"]],
  ["troubleshooting", "Why is there no result on the map?", ["faq/troubleshooting.md", "methodology/cat_workflow.md"]],
  ["troubleshooting", "The reachable area did not display. What should I check?", ["faq/troubleshooting.md", "methodology/cat_workflow.md"]],
  ["troubleshooting", "The analysis failed and I see an empty result.", ["faq/troubleshooting.md", "methodology/cat_workflow.md"]],
  ["troubleshooting", "No reachable area appears after I click run.", ["faq/troubleshooting.md", "methodology/cat_workflow.md"]],
  ["general_question", "Who created this website?", []],
  ["general_question", "Can you tell me tomorrow's weather?", []],
];

const unsupportedQueries = [
  ["specific_poi_query", "Which supermarket is closest for my child from Hauptbahnhof?", "children_family", "Hauptbahnhof"],
  ["specific_poi_query", "What is the nearest bakery reachable for a three-year-old from Hamburg Hauptbahnhof?", "children_family", "Hamburg Hauptbahnhof"],
  ["specific_poi_query", "Where is the closest pharmacy for a wheelchair user near Hauptbahnhof?", "wheelchair_user", "Hauptbahnhof"],
  ["specific_poi_query", "Which cafe should an elderly person go to from Hamburg Hauptbahnhof?", "elderly", "Hamburg Hauptbahnhof"],
  ["specific_poi_query", "Find the nearest toilet for a visually impaired pedestrian.", "visually_impaired", null],
  ["route_recommendation", "For an elderly person, what is the most comfortable route from Hauptbahnhof to the lake?", "elderly", "Hauptbahnhof"],
  ["route_recommendation", "Give me step-by-step navigation from Hamburg Hauptbahnhof to a cafe.", "default_adult", "Hamburg Hauptbahnhof"],
  ["route_recommendation", "Which path should a wheelchair user take from the station to the park?", "wheelchair_user", null],
  ["route_recommendation", "How do I get from Hauptbahnhof to the waterfront with the safest crossings?", "default_adult", "Hauptbahnhof"],
  ["route_recommendation", "Plan the best route for a blind pedestrian from the selected point to a shop.", "visually_impaired", null],
];

function currentResultContext(extra = {}) {
  return {
    currentCity: "hamburg",
    currentStartPoint: [10.01, 53.55],
    currentWalkingTime: 15,
    currentWalkingSpeed: 5,
    latestResultMetadata: {
      id: "expanded_latest_result",
      profile: "elderly",
      city: "hamburg",
      isDefault: false,
      defaultAreaHa: 120,
      comfortAdjustedAreaHa: 72,
      comfortRatio: 0.6,
      poiCount: 18,
      enabledVariables: ["stair", "slope", "kerbsHigh"],
      missingDataWarnings: [],
      startPoint: [10.01, 53.55],
    },
    analysisHistory: [
      {
        id: "expanded_previous_result",
        profile: "elderly",
        city: "hamburg",
        startPoint: [10.0, 53.55],
        walkingTime: 15,
        walkingSpeed: 4,
        enabledVariables: ["stair", "slope", "kerbsHigh"],
        resultMetadata: {
          comfortRatio: 0.52,
          comfortAdjustedAreaHa: 61,
          poiCount: 14,
          startPoint: [10.0, 53.55],
        },
      },
    ],
    ...extra,
  };
}

const followUpQueries = [
  ["explain_result", "Explain the latest CAT result.", currentResultContext(), null],
  ["explain_result", "What does the comfort ratio in this result mean?", currentResultContext(), null],
  ["explain_result", "Is this red area result good or bad?", currentResultContext(), null],
  ["explain_result", "Summarize the computed accessibility result for me.", currentResultContext(), null],
  ["compare_with_previous_result", "How does this new point compare with the previous result?", currentResultContext({ currentStartPoint: [10.02, 53.56] }), "elderly"],
  ["compare_with_previous_result", "What about this selected point compared with last time?", currentResultContext({ currentStartPoint: [10.02, 53.56] }), "elderly"],
  ["compare_with_previous_result", "Is the current point better than the last one?", currentResultContext({ currentStartPoint: [10.02, 53.56] }), "elderly"],
  ["compare_with_previous_result", "Compare this place with the result we just ran.", currentResultContext({ currentStartPoint: [10.02, 53.56] }), "elderly"],
  ["compare_with_previous_result", "Can we compare the two existing CAT results?", currentResultContext({
    currentStartPoint: [10.03, 53.57],
    analysisHistory: [
      {
        id: "expanded_previous_result",
        profile: "elderly",
        city: "hamburg",
        startPoint: [10.0, 53.55],
        walkingTime: 15,
        walkingSpeed: 4,
        enabledVariables: ["stair", "slope", "kerbsHigh"],
        resultMetadata: { comfortRatio: 0.52, comfortAdjustedAreaHa: 61, poiCount: 14, startPoint: [10.0, 53.55] },
      },
      {
        id: "expanded_current_result",
        profile: "elderly",
        city: "hamburg",
        startPoint: [10.03, 53.57],
        walkingTime: 15,
        walkingSpeed: 4,
        enabledVariables: ["stair", "slope", "kerbsHigh"],
        resultMetadata: { comfortRatio: 0.68, comfortAdjustedAreaHa: 80, poiCount: 22, startPoint: [10.03, 53.57] },
      },
    ],
  }), "elderly"],
  ["compare_with_previous_result", "I selected a new point. Is it more suitable than the previous one?", currentResultContext({ currentStartPoint: [10.04, 53.58] }), "elderly"],
];

const edgeQueries = [
  ["area_suitability_question", "I use a wheelchair and need ramps in Hamburg.", "wheelchair_user", "Hamburg", ["stair", "slope", "kerbsHigh"], []],
  ["area_suitability_question", "I am elderly and want to consider noise in Penteli.", "elderly", "Penteli", ["stair", "slope"], ["noise"], "penteli"],
  ["area_suitability_question", "I am visually impaired and need good lighting in Penteli.", "visually_impaired", "Penteli", ["trafficLight"], ["light"], "penteli"],
  ["area_suitability_question", "I use a wheelchair and want to avoid high kerbs in Penteli.", "wheelchair_user", "Penteli", ["stair", "slope"], ["kerbsHigh"], "penteli"],
  ["area_suitability_question", "I am elderly near the station. Is it convenient?", "elderly", "the station", ["stair", "slope"], []],
  ["area_suitability_question", "I am pregnant and get tired easily. Is the selected area okay?", "elderly", null, ["stair", "slope"], []],
  ["area_suitability_question", "I have a temporary leg injury and walk slowly. Is this area okay?", "elderly", null, ["stair", "slope"], []],
  ["area_suitability_question", "For a stroller user, can I move around the selected area?", "children_family", null, ["stair", "kerbsHigh"], []],
  ["area_suitability_question", "I am not sure which profile fits me, but I need a slow walking setting.", "elderly", null, ["stair", "slope"], []],
  ["area_suitability_question", "Can you analyze Hamburg generally without a start point?", "default_adult", "Hamburg", ["light", "trafficLight"], []],
];

function repeatTo50(items, builder) {
  const out = [];
  for (let i = 0; i < 50; i += 1) {
    out.push(builder(items[i % items.length], i));
  }
  return out;
}

const cases = [
  ...repeatTo50(profileQueries, ([profileKey, query, location], i) => {
    const spec = profileSpecs[profileKey];
    const hasPoint = i % 5 === 2 || i % 5 === 4;
    const hasLocation = Boolean(location);
    const context = {
      currentCity: "hamburg",
      currentWalkingTime: 15,
      currentWalkingSpeed: 5,
      ...(hasPoint && !hasLocation ? { currentStartPoint: [10.01 + i / 10000, 53.55] } : {}),
    };
    return caseOf({
      id: `expanded_accessibility_${String(i + 1).padStart(3, "0")}`,
      category: "expanded high-frequency accessibility action",
      query,
      context,
      expectedIntent: query.includes("reachable") || query.includes("reach from") ? "catchment_area_analysis" : "area_suitability_question",
      expectedProfile: spec.profile,
      expectedLocationText: location,
      expectedSources: spec.sources,
      expectedVariables: spec.variables,
      forbiddenVariables: spec.forbidden,
      shouldRunAnalysis: hasLocation || hasPoint,
      shouldAskForMapPoint: !hasLocation && !hasPoint,
    });
  }),
  ...repeatTo50(knowledgeQueries, ([intent, query, sources, variableKey, city], i) => caseOf({
    id: `expanded_knowledge_${String(i + 1).padStart(3, "0")}`,
    category: "expanded knowledge and RAG",
    query,
    context: { currentCity: city || "hamburg" },
    expectedIntent: intent,
    expectedCity: city || "hamburg",
    expectedSources: sources,
    shouldRunAnalysis: false,
    shouldAskForMapPoint: false,
  })),
  ...repeatTo50(unsupportedQueries, ([intent, query, profile, location], i) => caseOf({
    id: `expanded_unsupported_${String(i + 1).padStart(3, "0")}`,
    category: "expanded unsupported boundary",
    query,
    context: { currentCity: "hamburg", currentWalkingTime: 15, currentWalkingSpeed: 5 },
    expectedIntent: intent,
    expectedProfile: profile,
    expectedLocationText: location,
    expectedSources: intent === "specific_poi_query"
      ? ["methodology/cat_workflow.md", "faq/how_to_use_cat.md"]
      : ["methodology/routing_logic.md", "methodology/cat_workflow.md"],
    expectedVariables: [],
    forbiddenVariables: ["stair", "slope", "trafficLight"],
    shouldRunAnalysis: false,
    shouldAskForMapPoint: false,
  })),
  ...repeatTo50(followUpQueries, ([intent, query, context, profile], i) => caseOf({
    id: `expanded_context_${String(i + 1).padStart(3, "0")}`,
    category: "expanded context and follow-up",
    query,
    context,
    expectedIntent: intent,
    expectedProfile: profile,
    expectedSources: intent === "explain_result" ? ["methodology/result_interpretation.md"] : [],
    expectedVariables: [],
    shouldRunAnalysis: false,
    shouldAskForMapPoint: false,
  })),
  ...repeatTo50(edgeQueries, ([intent, query, profile, location, variables, warnings, city], i) => {
    const expectedCity = city || "hamburg";
    return caseOf({
      id: `expanded_edge_${String(i + 1).padStart(3, "0")}`,
      category: "expanded long-tail and edge cases",
      query,
      context: { currentCity: expectedCity, currentWalkingTime: 15, currentWalkingSpeed: 5 },
      expectedIntent: intent,
      expectedProfile: profile,
      expectedCity,
      expectedLocationText: location,
      expectedSources: [
        `profiles/${profile}.md`,
        "variables/comfort_variables.md",
        `cities/${expectedCity}.md`,
      ],
      expectedVariables: variables,
      forbiddenVariables: ["noise"],
      shouldRunAnalysis: false,
      shouldAskForMapPoint: true,
      expectedWarnings: warnings,
    });
  }),
];

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(cases, null, 2)}\n`, "utf8");

const byCategory = cases.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] || 0) + 1;
  return acc;
}, {});

console.log(`Wrote ${cases.length} cases to ${path.relative(process.cwd(), OUT)}`);
console.log(JSON.stringify(byCategory, null, 2));
