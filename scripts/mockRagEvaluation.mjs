import { loadRagIndex, queryRagIndex } from "../utils/ragIndex.js";

const tests = [
  {
    id: "wheelchair_accessibility",
    query: "无障碍设施附近哪个区域更适合轮椅用户",
    city: "hamburg",
    topK: 6,
    expectedLayers: ["wc_disabled", "slope", "poor_pavement", "kerbs_high", "obstacle", "sidewalk_narrow"],
    minExpected: 4,
  },
  {
    id: "wheelchair_slope",
    query: "哪里坡度更适合轮椅通过",
    city: "hamburg",
    topK: 5,
    expectedLayers: ["slope", "wc_disabled", "poor_pavement", "kerbs_high"],
    minExpected: 3,
  },
  {
    id: "wheelchair_kerb_steps",
    query: "轮椅用户如何避开高路缘和台阶",
    city: "hamburg",
    topK: 5,
    expectedLayers: ["kerbs_high", "stair", "obstacle", "sidewalk_narrow"],
    minExpected: 3,
  },
  {
    id: "visual_impairment",
    query: "视觉障碍者需要盲道和夜间照明",
    city: "hamburg",
    topK: 5,
    expectedLayers: ["tactile_lines", "tactile_points", "tactile_polygons", "streetlight", "trafic_light"],
    minExpected: 2,
  },
];

function getLayerId(resultId) {
  const parts = resultId.split("_");
  return parts.slice(1).join("_");
}

function evaluateResult(test, results) {
  const found = results.map((r) => getLayerId(r.id));
  const matched = test.expectedLayers.filter((layerId) => found.includes(layerId));
  return {
    ...test,
    found,
    matched,
    score: matched.length,
    passed: matched.length >= test.minExpected,
  };
}

async function main() {
  const index = await loadRagIndex();
  const outcomes = [];

  for (const test of tests) {
    const results = queryRagIndex({ index, query: test.query, city: test.city, topK: test.topK });
    const outcome = evaluateResult(test, results);
    outcomes.push({ test: outcome, results });
  }

  console.log("=== Mock RAG 验证报告 ===\n");
  outcomes.forEach(({ test, results }) => {
    console.log(`测试: ${test.id}`);
    console.log(`问题: ${test.query}`);
    console.log(`期望层: ${test.expectedLayers.join(", ")}`);
    console.log(`命中层: ${test.matched.join(", ") || "无"}`);
    console.log(`通过: ${test.passed ? "✅" : "❌"} (${test.score}/${test.minExpected})`);
    console.log("结果 TopK:");
    results.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.id} (${doc.description}) score=${doc.score.toFixed(4)}`);
    });
    console.log("");
  });

  const passedCount = outcomes.filter((o) => o.test.passed).length;
  console.log(`总测试: ${outcomes.length}，通过: ${passedCount}，失败: ${outcomes.length - passedCount}`);
  if (passedCount !== outcomes.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
