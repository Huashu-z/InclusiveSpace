import test from "node:test";
import assert from "node:assert/strict";
import { getAgentModelConfig, isAgentLlmEnabled } from "../utils/bigModelClient.js";
import { applyLlmReplyToDeterministicBaseline } from "../utils/agentLlm.js";

function withEnv(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("DashScope uses the OpenAI-compatible endpoint and configured models", () => {
  withEnv({
    AGENT_LLM_PROVIDER: "dashscope",
    DASHSCOPE_API_KEY: "test-only",
    DASHSCOPE_BASE_URL: "https://example.invalid/compatible-mode/v1/",
    DASHSCOPE_MODEL: "qwen3.7-plus",
  }, () => {
    const config = getAgentModelConfig();
    assert.equal(config.provider, "dashscope");
    assert.equal(config.chatUrl, "https://example.invalid/compatible-mode/v1/chat/completions");
    assert.equal(config.model, "qwen3.7-plus");
    assert.equal(isAgentLlmEnabled(), true);
  });
});

test("BigModel remains backward compatible", () => {
  withEnv({ AGENT_LLM_PROVIDER: "bigmodel", BIGMODEL_API_KEY: "test-only" }, () => {
    const config = getAgentModelConfig();
    assert.equal(config.provider, "bigmodel");
    assert.match(config.chatUrl, /open\.bigmodel\.cn/);
    assert.equal(isAgentLlmEnabled(), true);
  });
});

test("LLM output cannot override deterministic action, intent, variables, or warnings", () => {
  const baselineAction = {
    type: "RUN_ACCESSIBILITY_ANALYSIS",
    profile: "wheelchair_user",
    city: "hamburg",
    coordinates: [10, 53],
    enabledVariables: ["stair", "slope", "kerbsHigh"],
    missingDataWarnings: ["baseline warning"],
  };
  const result = applyLlmReplyToDeterministicBaseline({
    parsed: {
      reply: "A clearer reply.",
      intent: "general_question",
      action: { type: "ANSWER_ONLY", enabledVariables: ["noise"] },
      missingDataWarnings: [],
    },
    response: { provider: "dashscope", model: "qwen3.7-plus" },
    detected: { intent: "area_suitability_question" },
    baselineAction,
    baselineReply: "Baseline reply.",
  });
  assert.equal(result.reply, "A clearer reply.");
  assert.equal(result.intent, "area_suitability_question");
  assert.deepEqual(result.action, baselineAction);
  assert.deepEqual(result.missingDataWarnings, ["baseline warning"]);
  assert.equal(result.llmDebug.actionAuthority, "deterministic_baseline");
});
