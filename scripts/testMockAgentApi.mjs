import handler from "../pages/api/agent.js";

process.env.USE_MOCK_AGENT = "true";
process.env.OPENAI_API_KEY = "";

function createRes() {
  let statusCode = 200;
  let body = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return payload;
    },
    get result() {
      return { statusCode, body };
    }
  };
}

const tests = [
  {
    id: "point_analysis_wheelchair",
    payload: {
      prompt: "无障碍设施附近哪个区域更适合轮椅用户？",
      profile: { id: "wheelchair", label: "轮椅用户" },
      selectedCity: "hamburg",
      layerIds: ["wc_disabled", "slope", "poor_pavement", "kerbs_high", "obstacle", "sidewalk_narrow", "streetlight", "tactile_guidance"],
      startPoint: [9.993, 53.5511],
      mode: "analysis"
    },
    assert: (res) => {
      const data = res.body;
      return data.mode === "mock" && Array.isArray(data.ragResults) && data.ragResults.length > 0 && data.reply && data.score !== undefined;
    },
  },
  {
    id: "region_recommendation_wheelchair",
    payload: {
      prompt: "哪个区域更适合轮椅用户？",
      profile: { id: "wheelchair", label: "轮椅用户" },
      selectedCity: "hamburg",
      layerIds: ["wc_disabled", "slope", "poor_pavement", "kerbs_high", "obstacle", "sidewalk_narrow"],
      startPoint: null,
      mode: "analysis"
    },
    assert: (res) => {
      const data = res.body;
      return data.mode === "mock" && Array.isArray(data.recommendedRegions) && data.recommendedRegions.length > 0 && data.reply;
    },
  },
];

async function runTest(test) {
  const req = { method: "POST", body: test.payload };
  const res = createRes();

  await handler(req, res);
  const result = res.result;

  const passed = result.statusCode === 200 && test.assert(result);
  return { testId: test.id, passed, result };
}

async function main() {
  const outcomes = [];
  for (const test of tests) {
    const outcome = await runTest(test);
    outcomes.push(outcome);
    console.log(`测试 ${test.id}：${outcome.passed ? "✅" : "❌"}`);
    if (!outcome.passed) {
      console.log("返回状态：", outcome.result.statusCode);
      console.log("返回数据：", JSON.stringify(outcome.result.body, null, 2));
    }
    console.log("");
  }

  const failed = outcomes.filter((o) => !o.passed);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
