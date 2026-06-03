import {
  validateAgentAction,
  validateAgentReply,
} from "../utils/agentSafety.js";

const cases = [
  {
    id: "valid_hamburg_action",
    run: () => validateAgentAction({
      type: "RUN_ACCESSIBILITY_ANALYSIS",
      city: "hamburg",
      profile: "elderly",
      coordinates: [10.0064, 53.5528],
      walkingTime: 15,
      walkingSpeed: 3,
      enabledVariables: ["stair", "slope"],
      layerValues: { stair: 0.6, slope: 0.7 },
    }).length === 0,
  },
  {
    id: "blocks_unsupported_city_variable",
    run: () => validateAgentAction({
      type: "RUN_ACCESSIBILITY_ANALYSIS",
      city: "penteli",
      profile: "elderly",
      coordinates: [23.8653, 38.0491],
      walkingTime: 15,
      walkingSpeed: 3,
      enabledVariables: ["noise"],
      layerValues: { noise: 0.5 },
    }).some((error) => error.includes("unsupported")),
  },
  {
    id: "blocks_raw_geojson_reply",
    run: () => validateAgentReply('{"type":"FeatureCollection","features":[{"geometry":{"coordinates":[1,2]}}]}').length > 0,
  },
  {
    id: "blocks_sql_or_secret_reply",
    run: () => validateAgentReply("DROP TABLE users; DATABASE_URL=postgresql://example").length > 0,
  },
];

for (const testCase of cases) {
  const passed = testCase.run();
  console.log(`test ${testCase.id}: ${passed ? "ok" : "failed"}`);
  if (!passed) process.exitCode = 1;
}
