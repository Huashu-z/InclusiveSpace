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

async function callAgent(body) {
  const res = createRes();
  await handler({ method: "POST", body }, res);
  if (res.statusCode !== 200) {
    throw new Error(`API returned ${res.statusCode}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludesAll(values, expected, label) {
  for (const item of expected) {
    assert(values.includes(item), `${label} should include ${item}`);
  }
}

function assertOnlyCollections(retrieval, expectedCollections, label) {
  const expected = new Set(expectedCollections);
  const actual = new Set((retrieval?.results || []).map((item) => item.collection));
  for (const collection of actual) {
    assert(expected.has(collection), `${label} should only retrieve ${expectedCollections.join(", ")}, got ${collection}`);
  }
}

const tests = [
  {
    id: "task15_test1_elderly_profile",
    async run() {
      const data = await callAgent({
        message: "I am an elderly person. Is Hamburg Hauptbahnhof convenient for walking?",
        city: "hamburg",
        currentMapState: { walkingTime: 15, walkingSpeed: 5 },
      });

      assert(data.intent === "run_accessibility_analysis", "intent should run accessibility analysis");
      assert(data.action.profile === "elderly", "profile should be elderly");
      assert(data.action.city === "hamburg", "city should be hamburg");
      assert(data.action.locationText === "Hamburg Hauptbahnhof", "locationText should be Hamburg Hauptbahnhof");
      assert(Math.abs(Number(data.action.walkingSpeed) - 3.0) < 0.01, "walkingSpeed should be around 3.0");
      assertIncludesAll(
        data.action.enabledVariables,
        ["stair", "slope", "unevenSurface", "poorPavement", "kerbsHigh", "obstacle"],
        "elderly enabledVariables",
      );
      assert(data.action.type === "RUN_ACCESSIBILITY_ANALYSIS", "analysis should be runnable");
      assert(Array.isArray(data.action.coordinates), "analysis should have geocoded coordinates");
    },
  },
  {
    id: "task15_test2_wheelchair_user",
    async run() {
      const data = await callAgent({
        message: "I use a wheelchair. Can I move around this area easily?",
        city: "hamburg",
        currentMapState: { walkingTime: 15, walkingSpeed: 5 },
      });

      assert(data.intent === "run_accessibility_analysis", "intent should run accessibility analysis");
      assert(data.action.profile === "wheelchair_user", "profile should be wheelchair_user");
      assert(data.action.type === "ASK_USER_TO_SELECT_POINT", "no location should ask user to select a point");
      assertIncludesAll(
        data.action.enabledVariables,
        ["stair", "kerbsHigh", "slope", "narrowRoads", "poorPavement", "unevenSurface"],
        "wheelchair enabledVariables",
      );
      assert(Number(data.action.layerValues.stair) <= 0.2, "wheelchair stair sensitivity should be high");
      assert(Number(data.action.layerValues.kerbsHigh) <= 0.3, "wheelchair kerbsHigh sensitivity should be high");
      assert(Number(data.action.layerValues.slope) <= 0.3, "wheelchair slope sensitivity should be high");
      assert(Number(data.action.layerValues.narrowRoads) <= 0.3, "wheelchair narrowRoads sensitivity should be high");
      assert(Number(data.action.layerValues.poorPavement) <= 0.3, "wheelchair poorPavement sensitivity should be high");
      assert(Number(data.action.layerValues.unevenSurface) <= 0.3, "wheelchair unevenSurface sensitivity should be high");
    },
  },
  {
    id: "task15_test3_variable_explanation",
    async run() {
      const data = await callAgent({
        message: "What does kerbsHigh mean?",
        city: "hamburg",
        currentMapState: {},
      });

      assert(data.intent === "explain_variable", "intent should be explain_variable");
      assert(data.action.type === "ANSWER_ONLY", "variable explanation should not create map action");
      assertOnlyCollections(data.retrieval, ["variables"], "variable explanation retrieval");
      assert(data.retrieval.results.some((item) => item.metadata?.variable_key === "kerbsHigh"), "should retrieve kerbsHigh variable knowledge");
    },
  },
  {
    id: "task15_test4_city_data_availability",
    async run() {
      const data = await callAgent({
        message: "Does Penteli have noise data?",
        city: "hamburg",
        currentMapState: {},
      });

      assert(data.intent === "ask_data_availability", "intent should be ask_data_availability");
      assert(data.action.type === "ANSWER_ONLY", "data availability should not run analysis");
      assert(data.action.city === "penteli", "city should be penteli");
      assertOnlyCollections(data.retrieval, ["cities", "methodology"], "city availability retrieval");
      assert(/noise/i.test(data.reply), "answer should mention noise data availability");
    },
  },
  {
    id: "task15_test5_missing_data_filtering",
    async run() {
      const data = await callAgent({
        message: "I am elderly and want to consider noise in Penteli.",
        city: "penteli",
        currentMapState: { walkingTime: 15, walkingSpeed: 5 },
      });

      assert(data.intent === "run_accessibility_analysis", "intent should run accessibility analysis");
      assert(data.action.city === "penteli", "city should be penteli");
      assert(!data.action.enabledVariables.includes("noise"), "noise should be removed from enabledVariables in Penteli");
      assert(!Object.prototype.hasOwnProperty.call(data.action.layerValues, "noise"), "noise should be removed from layerValues in Penteli");
      assert(data.missingDataWarnings.some((warning) => /noise/i.test(warning)), "missingDataWarnings should mention noise");
      assert(!/noise was considered|considered noise/i.test(data.reply), "reply should not claim noise was considered");
    },
  },
  {
    id: "task15_test6_result_explanation",
    async run() {
      const data = await callAgent({
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
      });

      assert(data.intent === "explain_result", "intent should be explain_result");
      assert(data.action.type === "ANSWER_ONLY", "result explanation should not run a new analysis");
      assert(data.reply.includes("Suitability score: 68/100"), "reply should include score based on comfort ratio");
      assert(data.reply.includes("120.50 ha"), "reply should mention baseline area");
      assert(data.reply.includes("82.30 ha"), "reply should mention comfort-adjusted area");
      assert(data.reply.includes("0.68"), "reply should mention comfort ratio");
      assert(data.reply.includes("stair, slope, kerbsHigh"), "reply should mention selected variables");
      assert(!data.reply.toLowerCase().includes("many stairs"), "reply should not invent physical reasons");
    },
  },
];

for (const test of tests) {
  try {
    await test.run();
    console.log(`${test.id}: PASS`);
  } catch (error) {
    console.error(`${test.id}: FAIL`);
    console.error(error.message);
    process.exitCode = 1;
  }
}
