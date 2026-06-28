import fs from "fs/promises";
import path from "path";

const OUT = path.join(process.cwd(), "eval", "agent_new_eval100_cases.json");

function makeCase({
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

const profile = {
  elderly: {
    sources: ["profiles/elderly.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    variables: ["stair", "slope"],
    forbidden: ["noise"],
  },
  wheelchair_user: {
    sources: ["profiles/wheelchair_user.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    variables: ["stair", "slope", "kerbsHigh"],
    forbidden: ["noise"],
  },
  visually_impaired: {
    sources: ["profiles/visually_impaired.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    variables: ["trafficLight", "pedestrianFlow"],
    forbidden: ["noise"],
  },
  children_family: {
    sources: ["profiles/children_family.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    variables: ["stair", "kerbsHigh", "trafficLight"],
    forbidden: ["noise"],
  },
  default_adult: {
    sources: ["profiles/default_adult.md", "variables/comfort_variables.md", "cities/hamburg.md"],
    variables: ["light", "trafficLight", "station"],
    forbidden: [],
  },
};

const currentPoint = [10.012, 53.552];
const currentContext = { currentCity: "hamburg", currentWalkingTime: 15, currentWalkingSpeed: 5, currentStartPoint: currentPoint };

const actionCases = [
  ["elderly", "My father is 78 and walks slowly. Can you check the current selected point?", null, currentContext],
  ["elderly", "For someone who needs rest often, is Hamburg Hauptbahnhof a good start area?", "Hamburg Hauptbahnhof"],
  ["elderly", "I get tired easily. Please prepare a walking comfort analysis for this area.", null],
  ["elderly", "I use a cane and want to know whether the selected place is okay for activity.", null, currentContext],
  ["wheelchair_user", "I need a step-free walking area from Hamburg Hauptbahnhof.", "Hamburg Hauptbahnhof"],
  ["wheelchair_user", "For reduced mobility, check the current point with wheelchair-friendly assumptions.", null, currentContext],
  ["wheelchair_user", "I use a wheelchair. Is the selected area reachable without many obstacles?", null],
  ["wheelchair_user", "Please analyze wheelchair comfort around Hauptbahnhof.", "Hauptbahnhof"],
  ["visually_impaired", "I have low vision and need safe crossings. Can you assess this place?", null],
  ["visually_impaired", "For a blind pedestrian, evaluate Hamburg Hauptbahnhof.", "Hamburg Hauptbahnhof"],
  ["visually_impaired", "My eyesight is poor; use visual-impaired walking assumptions for the selected point.", null, currentContext],
  ["visually_impaired", "Can you check whether this area is comfortable for someone with limited vision?", null],
  ["children_family", "A parent with a stroller wants to walk from Hamburg Hauptbahnhof. Is it suitable?", "Hamburg Hauptbahnhof"],
  ["children_family", "Can you prepare settings for a toddler and family around the selected place?", null],
  ["children_family", "A three-year-old child will walk with us. What can we reach from the current point?", null, currentContext, "catchment_area_analysis"],
  ["children_family", "Family with kids: please assess this area before we walk.", null],
  ["default_adult", "Can you run a normal adult walking comfort analysis from Hamburg Hauptbahnhof?", "Hamburg Hauptbahnhof"],
  ["default_adult", "I have no special profile. Check the selected start point for a 15-minute walk.", null, currentContext],
  ["default_adult", "Analyze Hamburg generally without a start point.", "Hamburg"],
  ["default_adult", "Is the place I selected suitable for everyday walking?", null, currentContext],
];

const knowledgeCases = [
  ["how_to_use", "What is the correct workflow before I run CAT?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["how_to_use", "How should I choose city, profile, speed and start point?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["how_to_use", "Can this assistant automatically update the map settings?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["how_to_use", "What can I ask this accessibility assistant to do?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["explain_variable", "What does kerbsHigh represent?", ["variables/comfort_variables.md"]],
  ["explain_variable", "Explain why stair matters in CAT.", ["variables/comfort_variables.md"]],
  ["explain_variable", "What is greeninf in the comfort variables?", ["variables/comfort_variables.md"]],
  ["explain_variable", "What does wcDisabled mean in this dataset?", ["variables/comfort_variables.md"]],
  ["explain_variable", "How should I understand obstacle as a variable?", ["variables/comfort_variables.md"]],
  ["ask_data_availability", "Does Penteli have poor pavement and lighting data?", ["cities/penteli.md", "methodology/data_limitations.md"], "penteli"],
  ["ask_data_availability", "Which Hamburg variables are available for wheelchair comfort?", ["cities/hamburg.md", "methodology/data_limitations.md"]],
  ["ask_data_availability", "Can Penteli evaluate noise for elderly users?", ["cities/penteli.md", "methodology/data_limitations.md"], "penteli"],
  ["troubleshooting", "I clicked run but the reachable area is empty. What should I check?", ["faq/troubleshooting.md", "methodology/cat_workflow.md"]],
  ["troubleshooting", "Why did the map not update after applying AI settings?", ["faq/troubleshooting.md", "methodology/cat_workflow.md"]],
  ["troubleshooting", "The result looks blank even though I selected a point.", ["faq/troubleshooting.md", "methodology/cat_workflow.md"]],
  ["general_question", "Can you book a taxi for me?", []],
  ["general_question", "What is the population of Hamburg today?", []],
  ["how_to_use", "Is this assistant for routes, areas, or both?", ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]],
  ["explain_variable", "What does narrowRoads capture?", ["variables/comfort_variables.md"]],
  ["ask_data_availability", "Can Hamburg consider traffic lights and stations?", ["cities/hamburg.md", "methodology/data_limitations.md"]],
];

const unsupportedCases = [
  ["specific_poi_query", "Which exact bakery is closest for a toddler from Hauptbahnhof?", "children_family", "Hauptbahnhof"],
  ["specific_poi_query", "Find the nearest pharmacy for a wheelchair user from Hamburg Hauptbahnhof.", "wheelchair_user", "Hamburg Hauptbahnhof"],
  ["specific_poi_query", "Which bench should my elderly father go to first?", "elderly", null],
  ["specific_poi_query", "What cafe is best for someone with low vision near Hauptbahnhof?", "visually_impaired", "Hauptbahnhof"],
  ["specific_poi_query", "Tell me the closest accessible toilet around this point.", "default_adult", null],
  ["route_recommendation", "Give me the safest route from Hauptbahnhof to the river.", "default_adult", "Hauptbahnhof"],
  ["route_recommendation", "For a wheelchair user, which path should I take to the park?", "wheelchair_user", null],
  ["route_recommendation", "Plan turn-by-turn directions for my grandma from Hamburg Hauptbahnhof.", "elderly", "Hamburg Hauptbahnhof"],
  ["route_recommendation", "Which exact street route avoids all stairs?", "wheelchair_user", null],
  ["route_recommendation", "Can you navigate a blind pedestrian to a supermarket?", "visually_impaired", null],
  ["specific_poi_query", "Which supermarket is reachable fastest for kids?", "children_family", null],
  ["specific_poi_query", "Where is the nearest quiet park entrance for an elderly person?", "elderly", null],
  ["route_recommendation", "Can you draw the least-cost route from the selected point?", "default_adult", null],
  ["specific_poi_query", "Rank the top three pharmacies by accessibility.", "default_adult", null],
  ["route_recommendation", "Take me from here to the station using the best path.", "default_adult", null],
  ["specific_poi_query", "Which restaurant is inside the comfortable catchment area?", "default_adult", null],
  ["route_recommendation", "For low vision, what is the safest path from this point to the waterfront?", "visually_impaired", null],
  ["specific_poi_query", "Which toilet is closest for a wheelchair user?", "wheelchair_user", null],
  ["route_recommendation", "Give me navigation instructions to the nearest bakery.", "default_adult", null],
  ["specific_poi_query", "Which playground can my three-year-old reach first?", "children_family", null],
];

const resultContext = {
  currentCity: "hamburg",
  currentStartPoint: [10.012, 53.552],
  currentWalkingTime: 15,
  currentWalkingSpeed: 4,
  latestResultMetadata: {
    id: "new_eval_latest",
    profile: "elderly",
    city: "hamburg",
    isDefault: false,
    defaultAreaHa: 140,
    comfortAdjustedAreaHa: 84,
    comfortRatio: 0.6,
    poiCount: 21,
    enabledVariables: ["stair", "slope", "kerbsHigh"],
    missingDataWarnings: [],
    startPoint: [10.012, 53.552],
  },
  analysisHistory: [
    {
      id: "new_eval_previous",
      profile: "elderly",
      city: "hamburg",
      startPoint: [10.002, 53.548],
      walkingTime: 15,
      walkingSpeed: 4,
      enabledVariables: ["stair", "slope", "kerbsHigh"],
      resultMetadata: { comfortRatio: 0.48, comfortAdjustedAreaHa: 66, poiCount: 15, startPoint: [10.002, 53.548] },
    },
  ],
};

const contextCases = [
  ["explain_result", "Give me a plain-language summary of the latest result.", resultContext],
  ["explain_result", "Is this comfort ratio acceptable for an elderly user?", resultContext],
  ["explain_result", "Why is the comfort-adjusted area smaller than the default area?", resultContext],
  ["explain_result", "What should I pay attention to in this CAT result?", resultContext],
  ["compare_with_previous_result", "Compare this selected point with the previous analysis.", { ...resultContext, currentStartPoint: [10.022, 53.557] }],
  ["compare_with_previous_result", "Is the new point better than the last one?", { ...resultContext, currentStartPoint: [10.024, 53.558] }],
  ["compare_with_previous_result", "Use the previous settings and compare after I selected this point.", { ...resultContext, currentStartPoint: [10.026, 53.559] }],
  ["compare_with_previous_result", "What changed compared with the analysis we just ran?", resultContext],
  ["compare_with_previous_result", "Can you compare the two CAT results I already have?", {
    ...resultContext,
    analysisHistory: [
      ...resultContext.analysisHistory,
      {
        id: "new_eval_current",
        profile: "elderly",
        city: "hamburg",
        startPoint: [10.03, 53.56],
        walkingTime: 15,
        walkingSpeed: 4,
        enabledVariables: ["stair", "slope", "kerbsHigh"],
        resultMetadata: { comfortRatio: 0.7, comfortAdjustedAreaHa: 96, poiCount: 28, startPoint: [10.03, 53.56] },
      },
    ],
    currentStartPoint: [10.03, 53.56],
  }],
  ["explain_result", "Explain the score and whether the area is good for activity.", resultContext],
  ["explain_result", "What does the red area mean in the latest result?", resultContext],
  ["compare_with_previous_result", "This point looks different; how does it compare?", { ...resultContext, currentStartPoint: [10.028, 53.561] }],
  ["explain_result", "Tell me the conclusion first, then the caveats.", resultContext],
  ["compare_with_previous_result", "Can you fairly compare this new point before running it?", { ...resultContext, currentStartPoint: [10.031, 53.562] }],
  ["explain_result", "Does the latest result prove the streets are safe?", resultContext],
  ["compare_with_previous_result", "What about the current selected point versus last time?", { ...resultContext, currentStartPoint: [10.033, 53.563] }],
  ["explain_result", "Summarize area, ratio, POIs and limitations.", resultContext],
  ["compare_with_previous_result", "Do we need to run again before comparing this point?", { ...resultContext, currentStartPoint: [10.035, 53.564] }],
  ["explain_result", "What is the main accessibility takeaway?", resultContext],
  ["compare_with_previous_result", "Compare current and previous comfort ratio if possible.", resultContext],
];

const edgeCases = [
  ["area_suitability_question", "For an older pedestrian in Penteli, can the analysis include noise?", "elderly", "penteli", "Penteli", ["stair", "slope"], ["noise"]],
  ["area_suitability_question", "A wheelchair user wants kerbs and ramps checked in Penteli.", "wheelchair_user", "penteli", "Penteli", ["stair", "slope"], ["kerbsHigh"]],
  ["area_suitability_question", "A blind pedestrian needs lighting in Penteli.", "visually_impaired", "penteli", "Penteli", ["trafficLight"], ["light"]],
  ["area_suitability_question", "I am not disabled but want the default adult settings for Hamburg.", "default_adult", "hamburg", "Hamburg", ["light", "trafficLight"], []],
  ["area_suitability_question", "Here is not selected yet, but my child wants to walk. Can you prepare settings?", "children_family", "hamburg", null, ["stair", "kerbsHigh"], []],
  ["area_suitability_question", "I have a knee injury and need a cautious walking profile.", "wheelchair_user", "hamburg", null, ["stair", "slope"], []],
  ["area_suitability_question", "My parent walks slowly but did not choose a start point.", "elderly", "hamburg", null, ["stair", "slope"], []],
  ["area_suitability_question", "Analyze this area for low vision but do not run until I pick a point.", "visually_impaired", "hamburg", null, ["trafficLight"], []],
  ["area_suitability_question", "Can you use stroller-friendly assumptions before I pick a location?", "children_family", "hamburg", null, ["stair", "kerbsHigh"], []],
  ["area_suitability_question", "I need reduced mobility settings in Hamburg, but no exact start point yet.", "wheelchair_user", "hamburg", "Hamburg", ["stair", "slope"], []],
  ["ask_data_availability", "Does Penteli support wheelchair toilet and noise?", null, "penteli", null, [], []],
  ["ask_data_availability", "If data is missing, should the agent still invent a reason?", null, "hamburg", null, [], []],
  ["troubleshooting", "I selected the city but forgot the start point; why no analysis?", null, "hamburg", null, [], []],
  ["how_to_use", "Should I ask for a nearest POI or a reachable area?", null, "hamburg", null, [], []],
  ["explain_variable", "What does station mean as an environmental factor?", null, "hamburg", null, [], []],
  ["area_suitability_question", "I am pregnant and want a conservative walking estimate.", "elderly", "hamburg", null, ["stair", "slope"], []],
  ["area_suitability_question", "A caregiver pushes a stroller and wants to avoid kerbs.", "children_family", "hamburg", null, ["kerbsHigh", "stair"], []],
  ["area_suitability_question", "Someone with poor eyesight wants to avoid confusing crossings.", "visually_impaired", "hamburg", null, ["trafficLight"], []],
  ["area_suitability_question", "A slow walker near the station asks if it is convenient.", "elderly", "hamburg", "the station", ["stair", "slope"], []],
  ["general_question", "Can you diagnose my medical condition from the map?", null, "hamburg", null, [], []],
];

const cases = [];

actionCases.forEach(([profileKey, query, location, context, intent], index) => {
  const spec = profile[profileKey];
  const hasRunPoint = (Boolean(location) && !["Hamburg", "Penteli"].includes(location)) || Boolean(context?.currentStartPoint);
  cases.push(makeCase({
    id: `new_action_${String(index + 1).padStart(3, "0")}`,
    category: "new simple and medium accessibility actions",
    query,
    context: context || { currentCity: "hamburg", currentWalkingTime: 15, currentWalkingSpeed: 5 },
    expectedIntent: intent || "area_suitability_question",
    expectedProfile: profileKey,
    expectedLocationText: location,
    expectedSources: spec.sources,
    expectedVariables: spec.variables,
    forbiddenVariables: spec.forbidden,
    shouldRunAnalysis: hasRunPoint,
    shouldAskForMapPoint: !hasRunPoint,
  }));
});

knowledgeCases.forEach(([intent, query, sources, city], index) => {
  cases.push(makeCase({
    id: `new_knowledge_${String(index + 1).padStart(3, "0")}`,
    category: "new knowledge and data questions",
    query,
    context: { currentCity: city || "hamburg" },
    expectedIntent: intent,
    expectedCity: city || "hamburg",
    expectedSources: sources,
  }));
});

unsupportedCases.forEach(([intent, query, profileKey, location], index) => {
  cases.push(makeCase({
    id: `new_unsupported_${String(index + 1).padStart(3, "0")}`,
    category: "new unsupported and boundary questions",
    query,
    context: { currentCity: "hamburg", currentWalkingTime: 15, currentWalkingSpeed: 5 },
    expectedIntent: intent,
    expectedProfile: profileKey,
    expectedLocationText: location,
    expectedSources: intent === "route_recommendation"
      ? ["methodology/routing_logic.md", "methodology/cat_workflow.md"]
      : ["methodology/cat_workflow.md", "faq/how_to_use_cat.md"],
    forbiddenVariables: ["stair", "slope", "trafficLight"],
  }));
});

contextCases.forEach(([intent, query, context], index) => {
  cases.push(makeCase({
    id: `new_context_${String(index + 1).padStart(3, "0")}`,
    category: "new context and result questions",
    query,
    context,
    expectedIntent: intent,
    expectedProfile: intent === "compare_with_previous_result" ? "elderly" : null,
    expectedSources: intent === "explain_result" ? ["methodology/result_interpretation.md"] : [],
  }));
});

edgeCases.forEach(([intent, query, profileKey, city, location, variables, warnings], index) => {
  cases.push(makeCase({
    id: `new_edge_${String(index + 1).padStart(3, "0")}`,
    category: "new complex edge cases",
    query,
    context: { currentCity: city, currentWalkingTime: 15, currentWalkingSpeed: 5 },
    expectedIntent: intent,
    expectedProfile: profileKey,
    expectedCity: city,
    expectedLocationText: location,
    expectedSources: intent === "area_suitability_question"
      ? [`profiles/${profileKey}.md`, "variables/comfort_variables.md", `cities/${city}.md`]
      : intent === "explain_variable"
        ? ["variables/comfort_variables.md"]
        : intent === "how_to_use"
          ? ["faq/how_to_use_cat.md", "methodology/cat_workflow.md"]
          : intent === "troubleshooting"
            ? ["faq/troubleshooting.md", "methodology/cat_workflow.md"]
            : intent === "ask_data_availability"
              ? [`cities/${city}.md`, "methodology/data_limitations.md"]
              : [],
    expectedVariables: variables,
    forbiddenVariables: [...new Set([...(profile[profileKey]?.forbidden || []), ...warnings])],
    shouldAskForMapPoint: intent === "area_suitability_question",
    expectedWarnings: warnings,
  }));
});

if (cases.length !== 100) throw new Error(`Expected 100 cases, got ${cases.length}`);

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(cases, null, 2)}\n`, "utf8");
console.log(`Wrote ${cases.length} cases to ${path.relative(process.cwd(), OUT)}`);
