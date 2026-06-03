import { extractJsonObject, isBigModelEnabled } from "../utils/bigModelClient.js";
import { maybeBuildLlmAgentResponse } from "../utils/agentLlm.js";

const cases = [
  {
    id: "plain_json",
    input: '{"reply":"ok","action":{"type":"ANSWER_ONLY"}}',
    assert: (value) => value?.reply === "ok",
  },
  {
    id: "fenced_json",
    input: '```json\n{"reply":"ok","intent":"general_question"}\n```',
    assert: (value) => value?.intent === "general_question",
  },
  {
    id: "prefixed_json",
    input: 'Here is the JSON: {"reply":"ok","missingDataWarnings":[]}',
    assert: (value) => Array.isArray(value?.missingDataWarnings),
  },
];

for (const testCase of cases) {
  const parsed = extractJsonObject(testCase.input);
  const passed = testCase.assert(parsed);
  console.log(`test ${testCase.id}: ${passed ? "ok" : "failed"}`);
  if (!passed) process.exitCode = 1;
}

if (process.env.AGENT_LLM_PROVIDER !== "bigmodel") {
  const passed = !isBigModelEnabled();
  console.log(`test bigmodel_disabled_by_default: ${passed ? "ok" : "failed"}`);
  if (!passed) process.exitCode = 1;
}

const noCallResult = await maybeBuildLlmAgentResponse({
  message: "What can this tool do?",
  detected: { intent: "how_to_use", city: "hamburg" },
  retrieval: { results: [] },
  baselineAction: { type: "ANSWER_ONLY", city: "hamburg" },
  baselineReply: "CAT workflow help.",
  currentMapState: { walkingTime: 15, walkingSpeed: 5 },
  resultMetadata: null,
});

if (process.env.AGENT_LLM_PROVIDER !== "bigmodel") {
  const passed = noCallResult === null;
  console.log(`test llm_layer_returns_null_when_disabled: ${passed ? "ok" : "failed"}`);
  if (!passed) process.exitCode = 1;
}
