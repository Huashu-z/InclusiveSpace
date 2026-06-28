import test from "node:test";
import assert from "node:assert/strict";
import { auditDatasets, evaluateCase } from "../scripts/eval-agent-v2.mjs";

const baseCase = {
  id: "synthetic", category: "test", query: "Check this point for a wheelchair user",
  expectedIntent: "area_suitability_question", expectedProfile: "wheelchair_user", expectedCity: "hamburg",
  expectedLocationText: null, expectedSources: ["profiles/wheelchair_user.md"], expectedVariables: ["stair"], forbiddenVariables: ["noise"],
  shouldRunAnalysis: true, shouldAskForMapPoint: false, expectedWarnings: [],
};

const baseData = {
  intent: "area_suitability_question", reply: "The accessibility analysis is ready.", answerMode: "ACTION_READY",
  action: { type: "RUN_ACCESSIBILITY_ANALYSIS", profile: "wheelchair_user", city: "hamburg", locationText: null, coordinates: [10, 53], enabledVariables: ["stair"], layerValues: {} },
  missingDataWarnings: [], citations: [{ source: "profiles/wheelchair_user.md" }], retrieval: { results: [{ metadata: { source: "profiles/wheelchair_user.md" } }] },
};

test("a clean applicable case passes", () => {
  const result = evaluateCase(baseCase, baseData, { llmMode: "off", casePassThreshold: .8 });
  assert.equal(result.pass, true);
  assert.equal(result.diagnostics.requiredVariableRecall, 1);
});

test("missing required and selected forbidden variables are caught", () => {
  const data = structuredClone(baseData);
  data.action.enabledVariables = ["noise"];
  const result = evaluateCase(baseCase, data, { llmMode: "off" });
  assert.equal(result.pass, false);
  assert.ok(result.failureIds.includes("action.required_variables"));
  assert.ok(result.failureIds.includes("safety.forbidden_variables"));
});

test("real-model fallback invalidates the case", () => {
  const data = structuredClone(baseData);
  data.debug = { llm: { provider: "bigmodel", fallback: "mock_pipeline", error: "429" } };
  const result = evaluateCase(baseCase, data, { llmMode: "bigmodel" });
  assert.equal(result.provider.honored, false);
  assert.equal(result.pass, false);
});

test("a real-mode fast path does not pretend an LLM call failed", () => {
  const result = evaluateCase(baseCase, baseData, { llmMode: "bigmodel" });
  assert.equal(result.provider.required, false);
  assert.equal(result.provider.honored, true);
});

test("intent-router fallback invalidates provider integrity", () => {
  const data = structuredClone(baseData);
  data.debug = { intentRouter: { provider: "bigmodel", fallback: "deterministic_intent_router", error: "timeout" } };
  const result = evaluateCase(baseCase, data, { llmMode: "bigmodel" });
  assert.equal(result.provider.honored, false);
});

test("dataset audit rejects contradictory labels", () => {
  const bad = { ...baseCase, shouldAskForMapPoint: true };
  const audit = auditDatasets([{ name: "x", cases: [bad] }]);
  assert.equal(audit.errors.length, 1);
});
